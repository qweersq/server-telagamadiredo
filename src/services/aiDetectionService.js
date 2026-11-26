const AiDetectionRepository = require('../repositories/aiDetectionRepository');
const { AiHelper } = require('../helpers');

/** 
 * Mapping type → nama fallback Bahasa Indonesia
 * Digunakan saat AI tidak bisa mendeteksi nama spesifik item
 */
const TYPE_FALLBACK_NAMES = {
    'Shoes': 'Sepatu',
    'Sandal': 'Sandal',
    'Tas': 'Tas',
    'Topi': 'Topi',
    'Jaket': 'Jaket',
    'Helm': 'Helm',
    'Karpet': 'Karpet',
    'Stroller': 'Stroller Bayi',
    'Jam Tangan': 'Jam Tangan',
    'Baju': 'Baju',
    'Celana': 'Celana',
    'Handuk': 'Handuk',
    'Selimut': 'Selimut',
    'Boneka': 'Boneka',
    'Kacamata': 'Kacamata',
    'Ikat Pinggang': 'Ikat Pinggang',
    'Dompet': 'Dompet',
    'Sarung Bantal': 'Sarung Bantal',
    'Taplak Meja': 'Taplak Meja',
    'Jas': 'Jas',
    'Kemeja': 'Kemeja',
    'Kebaya': 'Kebaya',
    'Batik': 'Batik',
    'Seragam': 'Seragam',
    'Buku': 'Buku',
    'Mainan': 'Mainan',
    'Alat Olahraga': 'Alat Olahraga',
    'Payung': 'Payung',
    'Sarung': 'Sarung',
    'Gorden': 'Gorden',
    'Seprei': 'Seprei',
    'Bed Cover': 'Bed Cover',
    'Jas Hujan': 'Jas Hujan',
};

/**
 * Fallback: jika name masih "Tidak Diketahui" atau kosong,
 * ganti dengan nama dasar dari TYPE_FALLBACK_NAMES
 */
function applyItemFallbacks(item) {
    if (!item) return item;
    const name = (item.name || '').trim();
    const type = (item.type || '').trim();

    if (!name || name === 'Tidak Diketahui' || name === 'tidak diketahui') {
        if (type && TYPE_FALLBACK_NAMES[type]) {
            item.name = TYPE_FALLBACK_NAMES[type];
        } else if (type && type !== 'Tidak Diketahui' && type !== 'tidak diketahui') {
            // Type ada tapi tidak di mapping — gunakan type langsung
            item.name = type;
        } else {
            item.name = 'Tidak Diketahui';
        }
    }

    return item;
}

class AiDetectionService {
    static async detectItems(photos, treatments, userPrompt, tenantId) {
        try {
            if (!photos || photos.length === 0) {
                throw new Error('Minimal 1 foto diperlukan');
            }
            if (!treatments || treatments.length === 0) {
                throw new Error('Daftar treatment diperlukan');
            }

            console.log('🤖 aiDetectionService - Starting detection:', {
                photosCount: photos.length,
                photosFirstUrl: photos[0]?.substring(0, 80),
                treatmentsCount: treatments.length,
                hasUserPrompt: !!userPrompt,
                tenantId
            });

            // Get store context (trending items/brands/treatments)
            const storeContext = await AiDetectionRepository.getStoreContext(tenantId);
            console.log('🤖 aiDetectionService - Store context:', JSON.stringify(storeContext));

            // Build system prompt
            const prompt = this.buildVisionPrompt(treatments, storeContext, userPrompt);
            console.log('🤖 aiDetectionService - Prompt built, length:', prompt.length);

            // Call Gemini Vision API
            console.log('🤖 aiDetectionService - Calling Gemini Vision...');
            const aiResponse = await AiHelper.generateVisionContent(photos, prompt);
            console.log('🤖 aiDetectionService - Gemini response received, length:', aiResponse?.length);

            // Parse AI response
            const parsedItems = this.parseAIResponse(aiResponse);
            console.log('🤖 aiDetectionService - Parsed items:', parsedItems.length, 'items');

            // Apply fallback: jika name "Tidak Diketahui", ganti dengan nama type
            for (const detectedItem of parsedItems) {
                if (detectedItem.item) {
                    applyItemFallbacks(detectedItem.item);
                }
            }

            // Process each detected item
            const results = await Promise.all(parsedItems.map(async (detectedItem, index) => {
                console.log('🤖 aiDetectionService - Processing item', (index + 1) + ':', detectedItem.item?.name, '- photos_indices:', detectedItem.photos_indices);
                // LIKE-search existing items in tenant's DB
                const matchedItems = await AiDetectionRepository.searchItems(
                    tenantId,
                    detectedItem.item.name,
                    detectedItem.item.brand
                );

                // Map recommended treatments
                const treatmentIds = detectedItem.recommended_treatments.map(t => t.id);
                const treatmentDetails = await AiDetectionRepository.getTreatmentsByIds(treatmentIds, tenantId);

                const treatmentsWithConfidence = detectedItem.recommended_treatments.map(rt => {
                    const detail = treatmentDetails.find(t => t.id === rt.id);
                    return detail ? {
                        id: detail.id,
                        name: detail.name,
                        price: parseFloat(detail.price),
                        confidence: rt.confidence
                    } : null;
                }).filter(Boolean);

                // Map photos_indices to actual URLs
                const itemPhotos = (detectedItem.photos_indices || [])
                    .filter(idx => idx >= 0 && idx < photos.length)
                    .map(idx => photos[idx]);

                console.log('🤖 aiDetectionService - Item', (index + 1), 'matched:', matchedItems.length, 'items, treatments:', treatmentsWithConfidence.length, ', photos:', itemPhotos.length);

                return {
                    id: `ai_${index + 1}`,
                    item: detectedItem.item,
                    matched_items: matchedItems.map(item => ({
                        id: item.id,
                        name: item.name,
                        brand: item.brand,
                        color: item.color,
                        material: item.material,
                        type: item.type
                    })),
                    condition: detectedItem.condition || '',
                    treatments: treatmentsWithConfidence,
                    photos: itemPhotos,
                    photos_indices: detectedItem.photos_indices
                };
            }));

            console.log('🤖 aiDetectionService - SUCCESS: returning', results.length, 'results');
            return results;
        } catch (error) {
            console.error('❌ aiDetectionService - Error:', error.message);
            throw new Error(error.message);
        }
    }

    static buildVisionPrompt(treatments, storeContext, userPrompt) {
        const treatmentsText = treatments.map(t =>
            `  { "id": ${t.id}, "name": "${t.name}", "price": ${t.price} }`
        ).join(',\n');

        let storeContextText = '';
        if (storeContext.top_items.length > 0 || storeContext.top_brands.length > 0 || storeContext.top_treatments.length > 0) {
            storeContextText = `\n\n📊 Tren pesanan 7 hari terakhir di toko ini:\n`;
            if (storeContext.top_items.length > 0) {
                storeContextText += `\n  🏆 Item terpopuler:\n`;
                storeContext.top_items.forEach((item, i) => {
                    storeContextText += `    ${i + 1}. ${item}\n`;
                });
            }
            if (storeContext.top_brands.length > 0) {
                storeContextText += `\n  🏷️ Brand dominan: ${storeContext.top_brands.join(', ')}\n`;
            }
            if (storeContext.top_treatments.length > 0) {
                storeContextText += `\n  🔥 Treatment favorit:\n`;
                storeContext.top_treatments.forEach((t, i) => {
                    storeContextText += `    ${i + 1}. ${t}\n`;
                });
            }
        }

        let userPromptText = '';
        if (userPrompt && userPrompt.trim()) {
            userPromptText = `\n\n📝 Catatan dari kasir (prioritaskan info ini):\n"${userPrompt.trim()}"\n`;
        }

        return `Kamu adalah asisten laundry profesional. Kamu akan menerima beberapa foto item laundry (bisa lebih dari 1 item dalam 1 foto). Tugasmu:
1. Kelompokkan foto berdasarkan item yang sama
   - ⚠️ 1 foto BISA berisi LEBIH dari 1 item. Jika dalam 1 foto ada beberapa item berbeda, hitung masing-masing sebagai item terpisah.
2. Untuk setiap item, deteksi: nama, brand, type, color, material
   - type: Jenis item — bisa "Shoes", "Sandal", "Tas", "Topi", "Jaket", "Helm", "Karpet", "Stroller", "Jam Tangan", dll. Deteksi secara otomatis dari foto.
   - name: Nama/model item (contoh: "Nike Air Max 90", "Sepatu Kanvas")
   - brand: Merek item (contoh: "Nike", "Adidas", "Vans")
   ⚠️ ATURAN FALLBACK NAME:
     • Jika YAKIN dengan nama/model spesifik → gunakan nama tersebut
     • Jika TIDAK YAKIN → jangan langsung "Tidak Diketahui", tapi gunakan nama kategori berdasarkan type + tampilan visual, contoh:
       - type "Shoes" terlihat seperti sepatu olahraga → "Sepatu Running"
       - type "Shoes" terlihat seperti sepatu sehari-hari → "Sepatu Casual"
       - type "Shoes" terlihat seperti sepatu kanvas → "Sepatu Kanvas"
       - type "Shoes" terlihat seperti sepatu formal → "Sepatu Formal"
       - type "Shoes" terlihat seperti sepatu boot → "Sepatu Boot"
       - type "Shoes" terlihat seperti sepatu anak → "Sepatu Anak"
       - type "Shoes" terlihat seperti sepatu wanita → "Sepatu Hak Tinggi" / "Sepatu Flat"
       - type "Sandal" → "Sandal Jepit" / "Sandal Kulit" / "Sandal Gunung" / "Sandal Swallow"
       - type "Tas" → "Tas Ransel" / "Tas Selempang" / "Tas Tote" / "Tas Pinggang" / "Tas Koper"
       - type "Jaket" → "Jaket Hoodie" / "Jaket Bomber" / "Jaket Kulit" / "Jaket Jeans"
       - type "Topi" → "Topi Baseball" / "Topi Bucket" / "Topi Rajut" / "Topi Koboi"
       - type "Helm" → "Helm Full Face" / "Helm Half Face" / "Helm Open Face"
     • HANYA gunakan "Tidak Diketahui" sebagai PILIHAN TERAKHIR jika benar-benar tidak bisa menentukan sama sekali
   ⚠️ ATURAN FALLBACK BRAND:
     • Jika tidak yakin dengan merek spesifik tapi item terlihat branded → isi "Lokal" atau "Non-Brand"
     • HANYA gunakan "Tidak Diketahui" sebagai PILIHAN TERAKHIR
   ⚠️ JANGAN pernah mengosongkan field — selalu isi dengan teks
3. Deskripsikan kondisi item dalam bahasa Indonesia
4. Rekomendasikan treatment yang paling cocok dari daftar yang diberikan

Perhatikan field store_context jika ada — ini adalah data tren 7 hari terakhir di toko ini. Gunakan sebagai referensi:
- Prioritas deteksi ke item/brand yang sedang tren
- Cocokkan dengan data item terpopuler jika ragu
- Rekomendasi treatment yang sesuai tren toko

Jika ada field user_prompt, prioritaskan info dari user_prompt untuk mendeteksi detail yang tidak terlihat di foto (bau, ukuran, riwayat servis, bahan spesifik, dll).${storeContextText}${userPromptText}

Daftar treatment yang tersedia:
${treatmentsText}

Kembalikan JSON valid (tanpa markdown, tanpa tag code):
{
  "items": [
    {
      "photos_indices": [0, 1, 2],
      "item": { "name": "", "brand": "", "type": "Shoes", "color": "", "material": "" },
      "condition": "Deskripsi kondisi dalam bahasa Indonesia",
      "recommended_treatments": [{ "id": 0, "confidence": 0 }]
    }
  ]
}`;
    }

    static parseAIResponse(response) {
        try {
            // Try direct parse first
            let parsed = JSON.parse(response);

            // Handle nested stringified JSON
            if (typeof parsed === 'string') {
                parsed = JSON.parse(parsed);
            }

            // Handle response wrapped in items key
            if (parsed.items && Array.isArray(parsed.items)) {
                return parsed.items;
            }

            // Handle response that is directly an array
            if (Array.isArray(parsed)) {
                return parsed;
            }

            throw new Error('Unexpected response format');
        } catch (parseError) {
            // Try to extract JSON from markdown code block
            const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (jsonMatch) {
                try {
                    const extracted = JSON.parse(jsonMatch[1].trim());
                    if (extracted.items && Array.isArray(extracted.items)) {
                        return extracted.items;
                    }
                    if (Array.isArray(extracted)) {
                        return extracted;
                    }
                } catch (e2) {
                    throw new Error(`Failed to parse AI response: ${parseError.message}`);
                }
            }
            throw new Error(`Failed to parse AI response: ${parseError.message}`);
        }
    }

    // ========== ITEM DETAIL ONLY (no treatments) ==========

    static async detectItemDetails(photos, userPrompt, tenantId) {
        try {
            if (!photos || photos.length === 0) {
                throw new Error('Minimal 1 foto diperlukan');
            }

            console.log('🤖 aiDetectionService - Starting ITEM DETAIL detection:', {
                photosCount: photos.length,
                photosFirstUrl: photos[0]?.substring(0, 80),
                hasUserPrompt: !!userPrompt,
                tenantId
            });

            // Get store context (trending items/brands)
            const storeContext = await AiDetectionRepository.getStoreContext(tenantId);
            console.log('🤖 aiDetectionService - Store context:', JSON.stringify(storeContext));

            // Build detail-only prompt (no treatments)
            const prompt = this.buildDetailVisionPrompt(storeContext, userPrompt);
            console.log('🤖 aiDetectionService - Detail prompt built, length:', prompt.length);

            // Call Gemini Vision API
            console.log('🤖 aiDetectionService - Calling Gemini Vision...');
            const aiResponse = await AiHelper.generateVisionContent(photos, prompt);
            console.log('🤖 aiDetectionService - Gemini response received, length:', aiResponse?.length);

            // Parse AI response
            const parsedItems = this.parseAIResponse(aiResponse);
            console.log('🤖 aiDetectionService - Parsed items:', parsedItems.length, 'items');

            // Apply fallback: jika name "Tidak Diketahui", ganti dengan nama type
            for (const detectedItem of parsedItems) {
                if (detectedItem.item) {
                    applyItemFallbacks(detectedItem.item);
                }
            }

            // Process each detected item
            const results = await Promise.all(parsedItems.map(async (detectedItem, index) => {
                console.log('🤖 aiDetectionService - Processing item', (index + 1) + ':', detectedItem.item?.name, '- photos_indices:', detectedItem.photos_indices);

                // LIKE-search existing items in tenant's DB
                const matchedItems = await AiDetectionRepository.searchItems(
                    tenantId,
                    detectedItem.item.name,
                    detectedItem.item.brand
                );

                // Map photos_indices to actual URLs
                const itemPhotos = (detectedItem.photos_indices || [])
                    .filter(idx => idx >= 0 && idx < photos.length)
                    .map(idx => photos[idx]);

                console.log('🤖 aiDetectionService - Item', (index + 1), 'matched:', matchedItems.length, 'items, photos:', itemPhotos.length);

                return {
                    id: `ai_${Date.now()}_${index + 1}`,
                    item: detectedItem.item,
                    matched_items: matchedItems.map(item => ({
                        id: item.id,
                        name: item.name,
                        brand: item.brand,
                        color: item.color,
                        material: item.material,
                        type: item.type
                    })),
                    condition: detectedItem.condition || '',
                    photos: itemPhotos,
                    photos_indices: detectedItem.photos_indices
                };
            }));

            console.log('🤖 aiDetectionService - ITEM DETAIL SUCCESS: returning', results.length, 'results');
            return results;
        } catch (error) {
            console.error('❌ aiDetectionService - Item detail error:', error.message);
            throw new Error(error.message);
        }
    }

    static buildDetailVisionPrompt(storeContext, userPrompt) {
        let storeContextText = '';
        if (storeContext.top_items.length > 0 || storeContext.top_brands.length > 0) {
            storeContextText = `\n\n📊 Tren pesanan 7 hari terakhir di toko ini:\n`;
            if (storeContext.top_items.length > 0) {
                storeContextText += `\n  🏆 Item terpopuler:\n`;
                storeContext.top_items.forEach((item, i) => {
                    storeContextText += `    ${i + 1}. ${item}\n`;
                });
            }
            if (storeContext.top_brands.length > 0) {
                storeContextText += `\n  🏷️ Brand dominan: ${storeContext.top_brands.join(', ')}\n`;
            }
        }

        let userPromptText = '';
        if (userPrompt && userPrompt.trim()) {
            userPromptText = `\n\n📝 Catatan dari kasir (prioritaskan info ini):\n"${userPrompt.trim()}"\n`;
        }

        return `Kamu adalah asisten laundry profesional. Kamu akan menerima beberapa FOTO item laundry (bisa lebih dari 1 item dari berbagai angle).

Tugasmu:
1. KELOMPOKKAN foto berdasarkan item yang SAMA
   - ⚠️ 1 foto BISA berisi LEBIH dari 1 item. Jika dalam 1 foto ada beberapa item berbeda, hitung masing-masing sebagai item terpisah.
   - Contoh: 10 foto bisa jadi cuma milik 3 item (masing-masing multi-angle)
   - Contoh: 4 foto bisa jadi 4 item berbeda (masing-masing 1 angle)
   - Contoh: 2 foto masing-masing isi 2 item berbeda → 4 item
2. Untuk SETIAP item unik, deteksi detail berikut:
   - name: Nama/model item (contoh: "Nike Air Max 90", "Sepatu Kanvas", "Jam Tangan Casio")
   - brand: Merek item (contoh: "Nike", "Adidas", "Vans", "Casio")
   - type: Jenis item — bisa "Shoes", "Sandal", "Tas", "Topi", "Jaket", "Helm", "Karpet", "Stroller", "Jam Tangan", dll. Deteksi secara otomatis dari foto.
   - color: Warna dominan (contoh: "White/Black", "Red")
   - material: Bahan utama (contoh: "Leather", "Knit", "Suede", "Canvas", "Denim", "Karet")
   ⚠️ ATURAN FALLBACK NAME:
     • Jika YAKIN dengan nama/model spesifik → gunakan nama tersebut
     • Jika TIDAK YAKIN → jangan langsung "Tidak Diketahui", tapi gunakan nama kategori berdasarkan type + tampilan visual, contoh:
       - type "Shoes" terlihat seperti sepatu olahraga → "Sepatu Running"
       - type "Shoes" terlihat seperti sepatu sehari-hari → "Sepatu Casual"
       - type "Shoes" terlihat seperti sepatu kanvas → "Sepatu Kanvas"
       - type "Shoes" terlihat seperti sepatu formal → "Sepatu Formal"
       - type "Shoes" terlihat seperti sepatu boot → "Sepatu Boot"
       - type "Shoes" terlihat seperti sepatu anak → "Sepatu Anak"
       - type "Shoes" terlihat seperti sepatu wanita → "Sepatu Hak Tinggi" / "Sepatu Flat"
       - type "Sandal" → "Sandal Jepit" / "Sandal Kulit" / "Sandal Gunung" / "Sandal Swallow"
       - type "Tas" → "Tas Ransel" / "Tas Selempang" / "Tas Tote" / "Tas Pinggang" / "Tas Koper"
       - type "Jaket" → "Jaket Hoodie" / "Jaket Bomber" / "Jaket Kulit" / "Jaket Jeans"
       - type "Topi" → "Topi Baseball" / "Topi Bucket" / "Topi Rajut" / "Topi Koboi"
       - type "Helm" → "Helm Full Face" / "Helm Half Face" / "Helm Open Face"
     • HANYA gunakan "Tidak Diketahui" sebagai PILIHAN TERAKHIR jika benar-benar tidak bisa menentukan sama sekali
   ⚠️ ATURAN FALLBACK BRAND:
     • Jika tidak yakin dengan merek spesifik tapi item terlihat branded → isi "Lokal" atau "Non-Brand"
     • HANYA gunakan "Tidak Diketahui" sebagai PILIHAN TERAKHIR
   ⚠️ JANGAN pernah mengosongkan field — selalu isi dengan teks
3. Deskripsikan kondisi item dalam bahasa Indonesia
4. Jumlah item yang direturn = jumlah item UNIK, BUKAN jumlah foto
5. photos_indices wajib menunjuk index foto asli milik item tersebut
6. JANGAN rekomendasikan treatment apa pun
7. JANGAN menambahkan field "recommended_treatments" di output

Perhatikan field store_context jika ada — ini adalah data tren 7 hari terakhir di toko ini. Gunakan sebagai referensi untuk deteksi nama dan brand.${storeContextText}${userPromptText}

Kembalikan JSON valid (tanpa markdown, tanpa tag code):
{
  "items": [
    {
      "photos_indices": [0, 1, 2],
      "item": { "name": "", "brand": "", "type": "Shoes", "color": "", "material": "" },
      "condition": "Deskripsi kondisi dalam bahasa Indonesia"
    }
  ]
}`;
    }
}

module.exports = AiDetectionService;
