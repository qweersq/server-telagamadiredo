const { AiHelper } = require('../helpers');
const { Branch, User } = require('../models');
const AbsentRepository = require('../repositories/absentRepository');
const LocationValidationService = require('./locationValidationService');

/**
 * Verifikasi foto bukti absen masuk / pulang.
 *
 * Foto diambil karyawan lewat aplikasi GPS Camera, jadi koordinat & waktu
 * sudah "dibakar" ke piksel sebagai watermark. EXIF tidak dipakai karena
 * uploadHelper me-resize lewat canvas (EXIF hilang).
 *
 * Satu panggilan Gemini Vision melakukan dua hal sekaligus:
 *   1. Ekstrak watermark (lat, lng, tanggal, jam foto)
 *   2. Cek apakah foto memang selfie/kehadiran di lokasi kerja
 *
 * Skoring dilakukan di Node (deterministik), bukan oleh AI.
 *
 * PENTING: keterlambatan TIDAK dinilai di sini. Telat dihitung dari jam
 * check-in vs jadwal kerja (lihat workScheduleService). Service ini hanya
 * memvalidasi kebenaran bukti foto.
 */

const VERDICT_THRESHOLD = { verified: 80, review: 50 };

// Bobot komponen skor akhir (total 100)
const WEIGHT = { distance: 40, date: 25, time: 20, presence: 15 };

const AI_TIMEOUT_MS = 45000;

const KIND_LABEL = { clock_in: 'absen masuk', clock_out: 'absen pulang' };

class AbsentVerificationService {
    static assertKind(kind) {
        if (!KIND_LABEL[kind]) throw new Error('kind harus salah satu dari: clock_in, clock_out');
        return kind;
    }

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
     * Skor tanggal: harus di hari yang sama dengan tanggal absen.
     * Beda 1 hari masih dapat separuh, lebih dari itu dianggap salah.
     */
    static dateScore(photoDate, absentDate) {
        if (!photoDate || !absentDate) return 0;

        const toDay = (value) => String(value).slice(0, 10);
        const photoDay = toDay(photoDate);
        const absentDay = toDay(absentDate);

        if (photoDay === absentDay) return 100;

        const diffDays = Math.abs(
            (new Date(`${photoDay}T00:00:00`) - new Date(`${absentDay}T00:00:00`)) / 86400000
        );

        if (diffDays === 1) return 50;
        return 0;
    }

    /**
     * Skor jam: bandingkan jam pada watermark dengan jam absen yang dicatat sistem.
     * Toleransi lebar karena watermark biasanya hanya menampilkan menit.
     */
    static timeScore(photoAt, systemTime) {
        if (!photoAt || !systemTime) return 0;

        const photo = String(photoAt).match(/(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
        const system = String(systemTime).match(/(\d{2}):(\d{2})/);
        if (!photo || !system) return 0;

        const photoMinutes = Number(photo[4]) * 60 + Number(photo[5]);
        const systemMinutes = Number(system[1]) * 60 + Number(system[2]);
        const diff = Math.abs(photoMinutes - systemMinutes);

        if (diff <= 15) return 100;
        if (diff <= 60) return 60;
        if (diff <= 180) return 30;
        return 0;
    }

    static parseCoords(lat, lng) {
        const parsedLat = lat === null || lat === undefined || lat === '' ? NaN : parseFloat(lat);
        const parsedLng = lng === null || lng === undefined || lng === '' ? NaN : parseFloat(lng);

        if (Number.isNaN(parsedLat) || Number.isNaN(parsedLng)) return null;
        if (Math.abs(parsedLat) > 90 || Math.abs(parsedLng) > 180) return null;

        return { lat: parsedLat, lng: parsedLng };
    }

    static buildPrompt({ absent, branch, kind, employee }) {
        const label = KIND_LABEL[kind];
        const branchName = branch?.name || 'cabang ini';
        const branchLat = branch?.latitude ?? '-';
        const branchLng = branch?.longitude ?? '-';
        const radius = branch?.checkin_radius_m ?? 150;
        const systemTime = kind === 'clock_in' ? absent.clock_in : absent.clock_out;

        return [
            `Kamu adalah auditor foto bukti ${label} karyawan agrowisata.`,
            'Tugasmu: membaca watermark pada foto dan menilai apakah foto itu benar bukti kehadiran karyawan.',
            '',
            `## Konteks ${label}`,
            `- Nama karyawan: ${employee?.name || '(tidak diketahui)'}`,
            `- Tanggal absen: ${absent.date}`,
            `- Jam ${label} tercatat sistem: ${systemTime || '-'}`,
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
            '## Instruksi penilaian kehadiran',
            '- person_visible: true bila terlihat orang (selfie/wajah) pada foto.',
            '- looks_like_workplace: true bila latar foto wajar untuk lokasi kerja (bukan foto layar, bukan foto orang lain di jalan).',
            '- is_screenshot: true bila foto tampak hasil tangkapan layar / foto ulang dari galeri, bukan kamera langsung.',
            '- confidence: 0-100, seberapa yakin kamu pada penilaian di atas.',
            '- reason: satu kalimat Bahasa Indonesia, maksimal 160 karakter, sebutkan bukti yang terlihat.',
            '',
            '## Aturan penting',
            '- JANGAN mengarang koordinat/waktu. Bila tidak terbaca, isi null.',
            '- Jangan menilai kualitas foto (buram/gelap) sebagai pelanggaran.',
            '- Bila tidak ada orang sama sekali pada foto, person_visible = false.',
            '',
            '## Format keluaran',
            'Balas HANYA JSON valid tanpa markdown, tanpa penjelasan tambahan:',
            '{',
            '  "watermark_readable": true,',
            '  "latitude": -7.96293258,',
            '  "longitude": 112.65454989,',
            '  "taken_at": "2026-11-15 07:52",',
            '  "watermark_address": "Pujon, Malang",',
            '  "person_visible": true,',
            '  "looks_like_workplace": true,',
            '  "is_screenshot": false,',
            '  "confidence": 88,',
            '  "reason": "Selfie karyawan di area parkir, watermark 15 Nov 07:52."',
            '}',
        ].join('\n');
    }

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
        const coords = AbsentVerificationService.parseCoords(parsed.latitude, parsed.longitude);
        const confidence = Number.isFinite(Number(parsed.confidence))
            ? Math.min(100, Math.max(0, Math.round(Number(parsed.confidence))))
            : 0;

        return {
            watermark_readable: Boolean(parsed.watermark_readable) && Boolean(coords),
            latitude: coords ? coords.lat : null,
            longitude: coords ? coords.lng : null,
            taken_at: parsed.taken_at ? String(parsed.taken_at).trim() : null,
            watermark_address: parsed.watermark_address ? String(parsed.watermark_address).trim() : null,
            person_visible: Boolean(parsed.person_visible),
            looks_like_workplace: Boolean(parsed.looks_like_workplace),
            is_screenshot: Boolean(parsed.is_screenshot),
            confidence,
            reason: parsed.reason ? String(parsed.reason).trim().slice(0, 300) : null,
        };
    }

    /**
     * Gabungkan hasil AI + perhitungan jarak menjadi skor & verdict.
     */
    static score({ ai, absent, branch, kind }) {
        const radius = branch?.checkin_radius_m || 150;
        const systemTime = kind === 'clock_in' ? absent.clock_in : absent.clock_out;

        let distance = null;
        const branchCoords = AbsentVerificationService.parseCoords(branch?.latitude, branch?.longitude);
        const photoCoords = AbsentVerificationService.parseCoords(ai.latitude, ai.longitude);

        if (branchCoords && photoCoords) {
            distance = Math.round(LocationValidationService.calculateDistance(
                photoCoords.lat, photoCoords.lng,
                branchCoords.lat, branchCoords.lng
            ));
        }

        const dateScore = AbsentVerificationService.dateScore(ai.taken_at, absent.date);
        const timeScore = AbsentVerificationService.timeScore(ai.taken_at, systemTime);

        const parts = {
            distance: { score: AbsentVerificationService.distanceScore(distance, radius), weight: WEIGHT.distance, value: distance },
            date: { score: dateScore, weight: WEIGHT.date, value: ai.taken_at },
            time: { score: timeScore, weight: WEIGHT.time, value: systemTime },
            presence: {
                score: ai.person_visible && ai.looks_like_workplace && !ai.is_screenshot ? ai.confidence : 0,
                weight: WEIGHT.presence,
                value: ai.person_visible,
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
            reasons.push('watermark GPS/waktu tidak terbaca');
        } else if (distance !== null && distance > radius * 5) {
            verdict = 'reject';
            reasons.push('lokasi foto di luar radius wajar');
        } else if (dateScore < 100) {
            verdict = 'review';
            reasons.push('tanggal foto tidak sesuai tanggal absen');
        } else if (ai.is_screenshot) {
            verdict = 'review';
            reasons.push('foto terindikasi screenshot');
        } else if (!ai.person_visible) {
            verdict = 'review';
            reasons.push('tidak terlihat orang pada foto');
        } else if (!ai.looks_like_workplace) {
            verdict = 'review';
            reasons.push('latar foto tidak seperti lokasi kerja');
        } else if (ai.confidence < 60) {
            verdict = 'review';
            reasons.push('AI tidak yakin dengan isi foto');
        } else if (timeScore < 100) {
            verdict = 'review';
            reasons.push('jam pada foto berbeda dengan jam absen');
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
            .filter((reason) => reason !== 'watermark GPS/waktu tidak terbaca')
            .forEach((reason) => bits.push(reason));

        if (ai.reason) bits.push(ai.reason);

        const label = verdict === 'verified' ? 'Terverifikasi' : verdict === 'review' ? 'Perlu dicek' : 'Ditolak';

        return `${label}: ${bits.join('. ')}`;
    }

    static column(kind, suffix) {
        return `ai_${kind}_${suffix}`;
    }

    /**
     * Picu verifikasi otomatis setelah foto diunggah.
     *
     * Sengaja fire-and-forget: hasil AI tidak boleh menggagalkan proses absen.
     * Semua error ditelan di sini — kalau gagal, baris absen hanya berubah jadi
     * `ai_clock_*_status = 'failed'` dan admin bisa menekan "Nilai ulang".
     */
    static autoVerify(absentId, kind) {
        setImmediate(() => {
            AbsentVerificationService.verify(absentId, kind).catch((error) => {
                console.warn(`⚠️ autoVerify absen ${absentId} (${kind}) gagal (diabaikan):`, error.message);
            });
        });
    }

    static async verify(absentId, kind) {
        AbsentVerificationService.assertKind(kind);

        const photoColumn = kind === 'clock_in' ? 'photo_clock_in' : 'photo_clock_out';

        const absent = await AbsentRepository.getById(absentId);
        if (!absent) throw new Error('Absen tidak ditemukan');
        if (!absent[photoColumn]) throw new Error('Absen ini belum punya foto bukti');

        const [branch, employee] = await Promise.all([
            absent.branch_id ? Branch.findByPk(absent.branch_id) : null,
            absent.employee_id ? User.findByPk(absent.employee_id) : null,
        ]);

        await AbsentRepository.update(absentId, { [AbsentVerificationService.column(kind, 'status')]: 'processing' });

        try {
            const prompt = AbsentVerificationService.buildPrompt({ absent, branch, kind, employee });

            const raw = await Promise.race([
                AiHelper.generateVisionContent([absent[photoColumn]], prompt),
                new Promise((_, reject) => setTimeout(
                    () => reject(new Error('Verifikasi AI melebihi batas waktu')),
                    AI_TIMEOUT_MS
                )),
            ]);

            if (!raw || raw === '-') throw new Error('Layanan AI vision sedang tidak aktif');

            const ai = AbsentVerificationService.normalizeAiResult(
                AbsentVerificationService.parseAIResponse(raw)
            );
            const result = AbsentVerificationService.score({ ai, absent, branch, kind });

            // Foto bisa saja diganti saat AI masih bekerja.
            const fresh = await AbsentRepository.getById(absentId);
            if (!fresh || !fresh[photoColumn] || fresh[AbsentVerificationService.column(kind, 'status')] !== 'processing') {
                return {
                    absent_id: absentId,
                    kind,
                    ai_status: fresh ? fresh[AbsentVerificationService.column(kind, 'status')] : 'skipped',
                    skipped: true,
                    reason: 'Data absen berubah saat verifikasi berjalan',
                };
            }

            await AbsentRepository.update(absentId, {
                [AbsentVerificationService.column(kind, 'status')]: 'done',
                [AbsentVerificationService.column(kind, 'score')]: result.score,
                [AbsentVerificationService.column(kind, 'verdict')]: result.verdict,
                [AbsentVerificationService.column(kind, 'reason')]: AbsentVerificationService.buildNote({ ai, ...result }),
                [AbsentVerificationService.column(kind, 'raw')]: { ai, parts: result.parts, raw: String(raw).slice(0, 4000) },
                [AbsentVerificationService.column(kind, 'at')]: new Date(),
                [`${kind}_lat`]: ai.latitude,
                [`${kind}_lng`]: ai.longitude,
                [`${kind}_distance_m`]: result.distance,
                [`${kind}_photo_at`]: AbsentVerificationService.toDateTime(ai.taken_at),
            });

            return {
                absent_id: absentId,
                kind,
                ai_status: 'done',
                score: result.score,
                verdict: result.verdict,
                distance_m: result.distance,
                radius_m: result.radius,
                watermark_readable: ai.watermark_readable,
                photo_taken_at: ai.taken_at,
                reason: AbsentVerificationService.buildNote({ ai, ...result }),
            };
        } catch (error) {
            const fresh = await AbsentRepository.getById(absentId).catch(() => null);
            const statusColumn = AbsentVerificationService.column(kind, 'status');
            if (fresh && fresh[statusColumn] === 'processing') {
                await AbsentRepository.update(absentId, {
                    [statusColumn]: 'failed',
                    [AbsentVerificationService.column(kind, 'reason')]: `Verifikasi gagal: ${error.message}`,
                    [AbsentVerificationService.column(kind, 'at')]: new Date(),
                });
            }

            throw new Error(error.message);
        }
    }

    /**
     * Admin/supervisor bisa menimpa verdict AI (mis. AI salah menilai).
     */
    static async override(absentId, kind, body, user) {
        AbsentVerificationService.assertKind(kind);

        const verdict = body.verdict ? String(body.verdict).trim().toLowerCase() : '';
        if (!['verified', 'review', 'reject'].includes(verdict)) {
            throw new Error('verdict harus salah satu dari: verified, review, reject');
        }

        const absent = await AbsentRepository.getById(absentId);
        if (!absent) throw new Error('Absen tidak ditemukan');

        const note = body.reason
            ? String(body.reason).trim()
            : `Ditinjau manual oleh ${user?.name || 'admin'}`;

        const updated = await AbsentRepository.update(absentId, {
            [AbsentVerificationService.column(kind, 'status')]: 'done',
            [AbsentVerificationService.column(kind, 'verdict')]: verdict,
            [AbsentVerificationService.column(kind, 'reason')]: note.slice(0, 300),
            [AbsentVerificationService.column(kind, 'at')]: new Date(),
        });

        return updated;
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

module.exports = AbsentVerificationService;
