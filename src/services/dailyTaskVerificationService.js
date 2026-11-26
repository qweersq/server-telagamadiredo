const { AiHelper } = require('../helpers');
const { Branch } = require('../models');
const DailyTaskRepository = require('../repositories/dailyTaskRepository');
const LocationValidationService = require('./locationValidationService');

/**
 * Verifikasi bukti foto tugas harian.
 *
 * Foto diambil karyawan lewat aplikasi GPS Camera, jadi koordinat & waktu
 * sudah "dibakar" ke piksel sebagai watermark. EXIF tidak dipakai karena
 * uploadHelper me-resize lewat canvas (EXIF hilang).
 *
 * Satu panggilan Gemini Vision melakukan dua hal sekaligus:
 *   1. Ekstrak watermark (lat, lng, waktu foto, alamat)
 *   2. Nilai foto terhadap konteks tugas (sesuai / terlihat selesai)
 *
 * Skoring dilakukan di Node (deterministik), bukan oleh AI.
 */

const VERDICT_THRESHOLD = { verified: 80, review: 50 };

// Bobot komponen skor akhir (total 100)
const WEIGHT = { distance: 40, date: 25, matches: 20, done: 15 };

const AI_TIMEOUT_MS = 45000;

class DailyTaskVerificationService {
    /**
     * Skor jarak: penuh di dalam radius, turun linear sampai 3x radius.
     */
    static distanceScore(distance, radius) {
        if (distance === null || distance === undefined) return 0;
        if (!radius || radius <= 0) return 0;
        if (distance <= radius) return 100;

        const maxDistance = radius * 3;
        if (distance >= maxDistance) return 0;

        return Math.round(((maxDistance - distance) / (maxDistance - radius)) * 100);
    }

    /**
     * Skor tanggal: harus di hari yang sama dengan `task_date`.
     * Beda 1 hari masih dapat separuh, lebih dari itu dianggap salah.
     */
    static dateScore(photoDate, taskDate) {
        if (!photoDate || !taskDate) return 0;

        const toDay = (value) => String(value).slice(0, 10);
        const photoDay = toDay(photoDate);
        const taskDay = toDay(taskDate);

        if (photoDay === taskDay) return 100;

        const diffDays = Math.abs(
            (new Date(`${photoDay}T00:00:00`) - new Date(`${taskDay}T00:00:00`)) / 86400000
        );

        if (diffDays === 1) return 50;
        return 0;
    }

    static parseCoords(lat, lng) {
        const parsedLat = lat === null || lat === undefined || lat === '' ? NaN : parseFloat(lat);
        const parsedLng = lng === null || lng === undefined || lng === '' ? NaN : parseFloat(lng);

        if (Number.isNaN(parsedLat) || Number.isNaN(parsedLng)) return null;
        if (Math.abs(parsedLat) > 90 || Math.abs(parsedLng) > 180) return null;

        return { lat: parsedLat, lng: parsedLng };
    }

    /**
     * Prompt ketat: AI hanya boleh menilai apa yang terlihat,
     * dan wajib mengisi null kalau watermark tidak terbaca.
     */
    static buildPrompt({ task, branch }) {
        const branchName = branch?.name || 'cabang ini';
        const branchLat = branch?.latitude ?? '-';
        const branchLng = branch?.longitude ?? '-';
        const radius = branch?.checkin_radius_m ?? 150;

        return [
            'Kamu adalah auditor foto bukti pekerjaan kebersihan/perawatan di agrowisata.',
            'Tugasmu: membaca watermark pada foto dan menilai apakah foto itu benar bukti tugas tersebut.',
            '',
            '## Konteks tugas',
            `- Judul tugas: "${task.title}"`,
            `- Area: ${task.area || '(tidak disebutkan)'}`,
            `- Tanggal tugas: ${task.task_date}`,
            `- Cabang: ${branchName}`,
            `- Koordinat cabang: ${branchLat}, ${branchLng}`,
            `- Radius toleransi: ${radius} meter`,
            '',
            '## Instruksi ekstraksi watermark',
            'Aplikasi kamera menempelkan watermark berisi koordinat, tanggal, jam, dan/atau alamat.',
            'Baca watermark itu dan isi field berikut:',
            '- latitude, longitude: angka desimal (negatif untuk selatan/barat). Konversi DMS ke desimal bila perlu.',
            '- taken_at: format "YYYY-MM-DD HH:mm" memakai tanggal & jam pada watermark (bukan jam sekarang).',
            '- watermark_address: teks alamat/lokasi yang tercetak, apa adanya.',
            '- watermark_readable: true hanya bila koordinat DAN tanggal benar-benar terbaca jelas.',
            '',
            '## Instruksi penilaian',
            '- matches_task: true bila isi foto memang area/benda yang disebut judul tugas.',
            '- looks_done: true bila pekerjaan pada judul tugas terlihat sudah dikerjakan dari foto.',
            '- confidence: 0-100, seberapa yakin kamu pada dua penilaian di atas.',
            '- reason: satu kalimat Bahasa Indonesia, maksimal 160 karakter, sebutkan bukti yang terlihat.',
            '',
            '## Aturan penting',
            '- JANGAN mengarang koordinat/waktu. Bila tidak terbaca, isi null.',
            '- Jangan menilai dari kualitas foto (buram/gelap) sebagai "tidak selesai".',
            '- Bila foto tidak berhubungan dengan tugas, matches_task = false.',
            '',
            '## Format keluaran',
            'Balas HANYA JSON valid tanpa markdown, tanpa penjelasan tambahan:',
            '{',
            '  "watermark_readable": true,',
            '  "latitude": -7.96293258,',
            '  "longitude": 112.65454989,',
            '  "taken_at": "2026-11-14 14:32",',
            '  "watermark_address": "Pujon, Malang",',
            '  "matches_task": true,',
            '  "looks_done": true,',
            '  "confidence": 88,',
            '  "reason": "Terlihat area mushola dengan lantai bersih, watermark 14 Nov 14:32."',
            '}',
        ].join('\n');
    }

    /**
     * Ambil JSON dari respons AI, termasuk kalau dibungkus ```json ... ```.
     */
    static parseAIResponse(raw) {
        if (!raw) throw new Error('AI tidak mengembalikan jawaban');

        let text = String(raw).trim();
        text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');
        if (start === -1 || end === -1 || end <= start) {
            throw new Error('Jawaban AI bukan JSON yang valid');
        }

        return JSON.parse(text.slice(start, end + 1));
    }

    static normalizeAiResult(parsed) {
        const coords = DailyTaskVerificationService.parseCoords(parsed.latitude, parsed.longitude);
        const confidence = Number.isFinite(Number(parsed.confidence))
            ? Math.min(100, Math.max(0, Math.round(Number(parsed.confidence))))
            : 0;

        return {
            watermark_readable: Boolean(parsed.watermark_readable) && Boolean(coords),
            latitude: coords ? coords.lat : null,
            longitude: coords ? coords.lng : null,
            taken_at: parsed.taken_at ? String(parsed.taken_at).trim() : null,
            watermark_address: parsed.watermark_address ? String(parsed.watermark_address).trim() : null,
            matches_task: Boolean(parsed.matches_task),
            looks_done: Boolean(parsed.looks_done),
            confidence,
            reason: parsed.reason ? String(parsed.reason).trim().slice(0, 300) : null,
        };
    }

    /**
     * Gabungkan hasil AI + perhitungan jarak menjadi skor & verdict.
     */
    static score({ ai, task, branch }) {
        const radius = branch?.checkin_radius_m || 150;

        let distance = null;
        const branchCoords = DailyTaskVerificationService.parseCoords(branch?.latitude, branch?.longitude);
        const photoCoords = DailyTaskVerificationService.parseCoords(ai.latitude, ai.longitude);

        if (branchCoords && photoCoords) {
            distance = Math.round(LocationValidationService.calculateDistance(
                photoCoords.lat, photoCoords.lng,
                branchCoords.lat, branchCoords.lng
            ));
        }

        const parts = {
            distance: {
                score: DailyTaskVerificationService.distanceScore(distance, radius),
                weight: WEIGHT.distance,
                value: distance,
            },
            date: {
                score: DailyTaskVerificationService.dateScore(ai.taken_at, task.task_date),
                weight: WEIGHT.date,
                value: ai.taken_at,
            },
            matches: {
                score: ai.matches_task ? 100 : 0,
                weight: WEIGHT.matches,
                value: ai.matches_task,
            },
            done: {
                score: ai.looks_done ? ai.confidence : 0,
                weight: WEIGHT.done,
                value: ai.looks_done,
            },
        };

        const total = Object.values(parts).reduce(
            (sum, part) => sum + (part.score * part.weight) / 100,
            0
        );

        let score = Math.round(total);
        let verdict;
        const reasons = [];

        // Aturan pengaman: hal-hal ini tidak boleh lolos jadi "verified".
        if (!ai.watermark_readable) {
            verdict = 'review';
            reasons.push('watermark tidak terbaca');
        } else if (distance !== null && distance > radius * 5) {
            verdict = 'reject';
            reasons.push('di luar radius wajar');
        } else if (parts.date.score < 100) {
            verdict = 'review';
            reasons.push('tanggal foto tidak sesuai');
        } else if (!ai.matches_task) {
            verdict = 'review';
            reasons.push('foto tidak sesuai tugas');
        } else if (!ai.looks_done || ai.confidence < 60) {
            verdict = 'review';
            reasons.push('AI tidak yakin pekerjaan selesai');
        } else if (score >= VERDICT_THRESHOLD.verified) {
            verdict = 'verified';
        } else if (score >= VERDICT_THRESHOLD.review) {
            verdict = 'review';
        } else {
            verdict = 'reject';
        }

        if (verdict !== 'verified') {
            score = Math.min(score, VERDICT_THRESHOLD.verified - 1);
        }

        return { score, verdict, distance, radius, parts, verdict_reasons: reasons };
    }

    static buildNote({ ai, verdict, distance, radius, verdict_reasons = [] }) {
        const bits = [];

        if (ai.watermark_readable) {
            bits.push(`Watermark terbaca${distance !== null ? `, ${distance} m dari cabang (batas ${radius} m)` : ''}`);
        } else {
            bits.push('Watermark GPS/waktu tidak terbaca');
        }

        verdict_reasons
            .filter((reason) => reason !== 'watermark tidak terbaca')
            .forEach((reason) => bits.push(reason));

        if (!ai.matches_task && !verdict_reasons.includes('foto tidak sesuai tugas')) {
            bits.push('foto tidak sesuai judul tugas');
        }
        if (!ai.looks_done) bits.push('pekerjaan belum terlihat selesai');
        if (ai.reason) bits.push(ai.reason);

        const label = verdict === 'verified' ? 'Terverifikasi' : verdict === 'review' ? 'Perlu dicek' : 'Ditolak';

        return `${label}: ${bits.join('. ')}`;
    }

    /**
     * Picu verifikasi otomatis setelah foto diunggah.
     *
     * Sengaja fire-and-forget: hasil AI tidak boleh menggagalkan proses upload
     * atau penyimpanan tugas. Semua error ditelan di sini — kalau gagal, baris
     * tugas hanya berubah jadi `ai_status = 'failed'` dan supervisor bisa
     * menekan "Nilai ulang" nanti.
     */
    static autoVerify(id, user) {
        setImmediate(() => {
            DailyTaskVerificationService.verify(id, user).catch((error) => {
                console.warn(`⚠️ autoVerify tugas ${id} gagal (diabaikan):`, error.message);
            });
        });
    }

    /**
     * Jalankan verifikasi untuk satu tugas. Hanya tugas berfoto yang bisa dinilai.
     */
    static async verify(id, user) {
        const task = await DailyTaskRepository.getById(id, user.tenant_id);
        if (!task) throw new Error('Tugas tidak ditemukan');
        if (!task.photo_url) throw new Error('Tugas ini belum punya foto bukti');

        const branch = await DailyTaskVerificationService.resolveBranch(task, user.tenant_id);

        await DailyTaskRepository.update(id, { ai_status: 'processing' });

        try {
            const prompt = DailyTaskVerificationService.buildPrompt({ task, branch });

            const raw = await Promise.race([
                AiHelper.generateVisionContent([task.photo_url], prompt),
                new Promise((_, reject) => setTimeout(
                    () => reject(new Error('Verifikasi AI melebihi batas waktu')),
                    AI_TIMEOUT_MS
                )),
            ]);

            if (!raw || raw === '-') throw new Error('Layanan AI vision sedang tidak aktif');

            const ai = DailyTaskVerificationService.normalizeAiResult(
                DailyTaskVerificationService.parseAIResponse(raw)
            );
            const result = DailyTaskVerificationService.score({ ai, task, branch });

            // Bisa saja tugas dibatalkan / fotonya diganti saat AI masih bekerja.
            const fresh = await DailyTaskRepository.getById(id, user.tenant_id);
            if (!fresh || !fresh.photo_url || fresh.ai_status !== 'processing') {
                return {
                    id,
                    ai_status: fresh ? fresh.ai_status : 'skipped',
                    skipped: true,
                    reason: 'Tugas berubah saat verifikasi berjalan',
                };
            }

            await DailyTaskRepository.update(id, {
                ai_status: 'done',
                ai_score: result.score,
                ai_verdict: result.verdict,
                ai_reason: DailyTaskVerificationService.buildNote({ ai, ...result }),
                ai_raw: { ai, parts: result.parts, raw: String(raw).slice(0, 4000) },
                ai_checked_at: new Date(),
                photo_lat: ai.latitude,
                photo_lng: ai.longitude,
                distance_m: result.distance,
                photo_taken_at: DailyTaskVerificationService.toDateTime(ai.taken_at),
            });

            return {
                id,
                ai_status: 'done',
                score: result.score,
                verdict: result.verdict,
                distance_m: result.distance,
                radius_m: result.radius,
                watermark_readable: ai.watermark_readable,
                photo_taken_at: ai.taken_at,
                reason: DailyTaskVerificationService.buildNote({ ai, ...result }),
            };
        } catch (error) {
            // Jangan timpa status kalau tugas sudah dibatalkan / diganti saat AI bekerja.
            const fresh = await DailyTaskRepository.getById(id, user.tenant_id).catch(() => null);
            if (fresh && fresh.ai_status === 'processing') {
                await DailyTaskRepository.update(id, {
                    ai_status: 'failed',
                    ai_reason: `Verifikasi gagal: ${error.message}`,
                    ai_checked_at: new Date(),
                });
            }

            throw new Error(error.message);
        }
    }

    /**
     * Supervisor bisa menimpa verdict AI (mis. AI salah menilai).
     */
    static async override(id, body, user) {
        const verdict = body.verdict ? String(body.verdict).trim().toLowerCase() : '';
        if (!['verified', 'review', 'reject'].includes(verdict)) {
            throw new Error('verdict harus salah satu dari: verified, review, reject');
        }

        const task = await DailyTaskRepository.getById(id, user.tenant_id);
        if (!task) throw new Error('Tugas tidak ditemukan');

        const note = body.reason ? String(body.reason).trim() : `Ditinjau manual oleh ${user.name || 'supervisor'}`;

        return await DailyTaskRepository.update(id, {
            ai_status: 'done',
            ai_verdict: verdict,
            ai_reason: note.slice(0, 300),
            ai_checked_at: new Date(),
        });
    }

    static async resolveBranch(task, tenant_id) {
        if (!task.branch_id) return null;

        return await Branch.findOne({ where: { id: task.branch_id, tenant_id } });
    }

    static toDateTime(value) {
        if (!value) return null;

        const match = String(value).match(/(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
        if (!match) return null;

        const [, y, m, d, hh, mm] = match;
        const date = new Date(`${y}-${m}-${d}T${hh}:${mm}:00`);
        return Number.isNaN(date.getTime()) ? null : date;
    }
}

module.exports = DailyTaskVerificationService;
