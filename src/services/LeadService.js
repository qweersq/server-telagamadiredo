const LeadRepository = require('../repositories/LeadRepository');
const LeadRecordRepository = require('../repositories/LeadRecordRepository');
const CustomerRepository = require('../repositories/customerRepository');

const { Op } = require('../models');
const moment = require('moment');

class LeadService {
    static async createLead(userId, data) {
        const existingLead = await LeadRepository.findByPhone(data.phone);
        if (existingLead) throw new Error('Nomor telepon sudah terdaftar');
        // check if lead phone is exist in customer table
        const customer = await CustomerRepository.getByPhone(data.phone);
        if (customer) throw new Error('Sudah menjadi customer');
        // next follow up date 3 hari dari sekarang
        data.next_follow_up_date = moment().add(3, 'days').toDate();
        return await LeadRepository.create({ ...data, created_by: userId });
    }

    static async getLeads(filters, page, limit) {
        return await LeadRepository.findAll(filters, page, limit);
    }

    static async getLead(id) {
        const lead = await LeadRepository.findById(id);
        if (!lead) throw new Error('Lead not found');
        return lead;
    }

    static async updateLead(id, data) {
        const lead = await LeadRepository.findById(id);
        if (!lead) throw new Error('Lead not found');
        return await LeadRepository.update(id, data);
    }

    static async createFollowUp(leadId, data) {
        const lead = await LeadRepository.findById(leadId);
        if (!lead) throw new Error('Lead not found');

        // Cek maksimum follow up
        if (lead.follow_up_count >= 7) {
            await LeadRepository.update(leadId, {
                status: 'Tidak Berminat'
            });
            throw new Error('Maksimum follow up (7 kali) telah tercapai');
        }

        // Validasi status
        const validStatuses = ['Berhasil', 'Tidak Berminat', 'Tidak Respon'];
        if (!validStatuses.includes(data.status)) throw new Error(`Status harus salah satu dari: ${validStatuses.join(', ')}`);

        const followUpData = {
            lead_id: leadId,
            follow_up_by: data.follow_up_by,
            follow_up_at: data.follow_up_at || new Date(),
            status: data.status,
            notes: data.notes
        };

        // Buat record follow up
        const record = await LeadRecordRepository.create(followUpData);

        // Set next follow up date (3 hari dari sekarang) jika status Tidak Respon
        const nextFollowUpDate = data.status === 'Tidak Respon'
            ? moment().add(3, 'days').toDate()
            : null;

        // Update lead status dan informasi terkait
        const updateData = {
            follow_up_count: lead.follow_up_count + 1,
            last_follow_up_by: data.follow_up_by,
            last_follow_up_at: data.follow_up_at || new Date(),
            next_follow_up_date: nextFollowUpDate,
            status: this.mapFollowUpStatusToLeadStatus(data.status)
        };

        // Jika status Berhasil, update conversion info
        if (data.status === 'Berhasil') {
            updateData.is_converted = true;
            updateData.conversion_date = new Date();
        }

        await LeadRepository.update(leadId, updateData);
        return record;
    }

    static async getLeadsForFollowUp() {
        const today = moment().startOf('day');
        const tomorrow = moment().endOf('day');

        const filters = {
            status: { [Op.notIn]: ['Berhasil', 'Tidak Berminat'] },
            next_follow_up_date: {
                [Op.between]: [today.toDate(), tomorrow.toDate()]
            },
            follow_up_count: { [Op.lt]: 7 }
        };

        return await LeadRepository.findAllForFollowUp(filters);
    }

    static async getLeadReports(startDate, endDate) {
        if (!startDate || !endDate) throw new Error('Tanggal awal dan akhir harus diisi');

        const leads = await LeadRepository.getLeadsForReport(startDate, endDate);

        const report = {
            total_leads: leads.length,
            converted_leads: leads.filter(l => l.is_converted).length,
            conversion_rate: 0,
            by_source: {},
            by_status: {},
            average_follow_ups: 0
        };

        if (leads.length > 0) {
            // Hitung conversion rate
            report.conversion_rate = (report.converted_leads / report.total_leads) * 100;

            // Hitung statistik per source dan status
            leads.forEach(lead => {
                report.by_source[lead.source] = (report.by_source[lead.source] || 0) + 1;
                report.by_status[lead.status] = (report.by_status[lead.status] || 0) + 1;
            });

            // Hitung rata-rata follow up
            report.average_follow_ups = leads.reduce((acc, lead) => acc + lead.follow_up_count, 0) / leads.length;
        }

        return report;
    }

    // Helper method untuk mapping status
    static mapFollowUpStatusToLeadStatus(followUpStatus) {
        const statusMapping = {
            'Berhasil': 'Berhasil',
            'Tidak Berminat': 'Tidak Berminat',
            'Tidak Respon': 'Tidak Respon'
        };
        return statusMapping[followUpStatus] || 'Baru';
    }
    static async deleteLead(id) {
        try {
            const deleted = await LeadRepository.delete(id);
            if (!deleted) throw new Error('Lead tidak ditemukan');
            return true;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    // static async createFollowUp(leadId, data) {
    //     try {
    //         const lead = await LeadRepository.findById(leadId);
    //         if (!lead) throw new Error('Lead tidak ditemukan');

    //         const followUpData = {
    //             ...data,
    //             lead_id: leadId,
    //             follow_up_number: lead.follow_up_count + 1
    //         };

    //         const record = await LeadRecordRepository.create(followUpData);

    //         await lead.update({
    //             follow_up_count: lead.follow_up_count + 1,
    //             last_follow_up_by: data.follow_up_by,
    //             last_follow_up_at: data.follow_up_at || new Date(),
    //             status: data.status
    //         });

    //         return record;
    //     } catch (error) {
    //         throw new Error(error.message);
    //     }
    // }

    static async getLeadRecords(leadId, page, limit) {
        try {
            const lead = await LeadRepository.findById(leadId);
            if (!lead) throw new Error('Lead tidak ditemukan');
            return await LeadRecordRepository.findByLeadId(leadId, page, limit);
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async updateLeadRecord(id, data) {
        try {
            const record = await LeadRecordRepository.update(id, data);
            if (!record) throw new Error('Lead Record tidak ditemukan');
            return record;
        } catch (error) {
            throw new Error(error.message);
        }
    }
}

module.exports = LeadService;