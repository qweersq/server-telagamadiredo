const ShiftRepository = require('../repositories/shiftRepository');

class ShiftService {
    static async create(data) {
        try {
            // ✅ Cek active shift sebelum create (prevent double shift)
            const activeShift = await ShiftRepository.getActive(data.branch_id, data.tenant_id);
            if (activeShift) {
                throw new Error('There is already an active shift for this branch');
            }
            
            return await ShiftRepository.create(data);
        } catch (error) {
            throw new Error(error.message);
        }
    }

    // ✅ Get active shift (lightweight for get-profile)
    static async getActive(branch_id, tenant_id) {
        try {
            console.log('🔍 ShiftService.getActive - Getting active shift for branch:', branch_id, 'tenant:', tenant_id);
            const result = await ShiftRepository.getActive(branch_id, tenant_id);
            console.log('✅ ShiftService.getActive - Result:', result ? { id: result.id, is_active: result.is_active } : 'null');
            return result;
        } catch (error) {
            console.error('❌ ShiftService.getActive - Error:', error.message);
            throw new Error(error.message);
        }
    }

    static async getAll(branch_id, tenant_id, user_role, page, limit, dateFilters = {}) {
        try {
            return await ShiftRepository.getAll(branch_id, tenant_id, user_role, page, limit, dateFilters);
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getShiftNow(branch_id) {
        try {
            const result = await ShiftRepository.getShiftNow(branch_id);
            if (!result) throw new Error('Shift not found');
            
            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getDataShift(start, end, branch_id = null) {
        try {
            const result = await ShiftRepository.calculateData(start, end, branch_id);
            
            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getById(id, user_tenant_id = null, user_role = null) {
        try {
            const result = await ShiftRepository.getShiftDetail(id, user_tenant_id, user_role);
            if (!result) throw new Error('Shift not found');

            return result; // ShiftRepository.getShiftDetail sudah mengembalikan semua data yang diperlukan termasuk account_breakdown
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async update(data) {
        try {
            const check = await ShiftRepository.getById(data.id);
            if (!check) throw new Error('Shift not found');

            const shifts = await ShiftRepository.getShiftNow(data.branch_id);
            if (!shifts) throw new Error('Shift not found');

            const dataUpdate = {
                id: data.id,
                end_time: Date.now(),
                expense: data.expense,
                cash_actual: data.cash_actual,
                difference: data.cash_actual - shifts.cash_expected + shifts.cash_initial - data.expense,
            };

            const result = await ShiftRepository.update(data.id, dataUpdate);

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async endShiftById(data) {
        try {
            console.log('🔍 ShiftService.endShiftById - Starting with data:', data);
            
            // ✅ Check if shift exists by ID and is still active
            const check = await ShiftRepository.getById(data.id, data.tenant_id, 'superadmin');
            if (!check) {
                console.log('❌ ShiftService.endShiftById - Shift not found by ID:', data.id);
                throw new Error('Shift not found');
            }
            
            // ✅ Check if shift is still active (end_time is null)
            if (check.end_time !== null) {
                console.log('❌ ShiftService.endShiftById - Shift already ended:', { id: check.id, end_time: check.end_time });
                throw new Error('Shift has already been ended');
            }
            
            // ✅ Verify branch_id matches
            if (check.branch_id !== data.branch_id) {
                console.log('❌ ShiftService.endShiftById - Branch ID mismatch:', { shift_branch_id: check.branch_id, request_branch_id: data.branch_id });
                throw new Error('Branch ID does not match');
            }
            
            console.log('✅ ShiftService.endShiftById - Shift found and active:', { id: check.id, branch_id: check.branch_id });

            // ✅ Get calculated shift data untuk cash_expected (pakai logic yang sudah ada)
            // Calculate langsung dengan shift_id yang spesifik untuk avoid mismatch
            const calculateData = await ShiftRepository.calculateData(check.start_time, new Date(), check.id, check.tenant_id, check.branch_id);
            const cashExpected = parseFloat(calculateData.cash_expected || 0);
            const cashInitial = parseFloat(check.cash_initial || 0);
            
            const dataUpdate = {
                end_time: Date.now(),
                expense: parseInt(data.expense || 0),
                cash_actual: data.cash_actual,
                difference: parseFloat(data.cash_actual) - (cashExpected + cashInitial - parseFloat(data.expense || 0)),
            };

            console.log('🔍 ShiftService.endShiftById - Updating shift with data:', dataUpdate);
            // ✅ Update directly by ID with WHERE end_time IS NULL (prevent double end)
            const result = await ShiftRepository.updateWithCondition(data.id, dataUpdate, { end_time: null });
            console.log('✅ ShiftService.endShiftById - Shift updated successfully');

            return result;
        } catch (error) {
            console.error('❌ ShiftService.endShiftById - Error:', error.message);
            throw new Error(error.message);
        }
    }

    static async getActiveBranches(tenant_id) {
        try {
            const branches = await ShiftRepository.getActiveBranches(tenant_id);
            return branches;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async delete(id, user_tenant_id = null, user_role = null) {
        try {
            const check = await ShiftRepository.getById(id, user_tenant_id, user_role);
            if (!check) throw new Error('Shift not found');

            await ShiftRepository.delete(id);

            return null;
        } catch (error) {
            throw new Error(error.message);
        }
    }
}

module.exports = ShiftService;