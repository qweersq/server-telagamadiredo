const CustomerRepository = require('../repositories/customerRepository');

const bcrypt = require('bcrypt');
const moment = require('moment');

class CustomerService {
    static async create(data, user_tenant_id = null, user_branch_id = null, user_role = null) {
        try {
            if (data.password) {
                const salt = await bcrypt.genSalt(10);
                data.password = await bcrypt.hash(data.password, salt);
            }

            if (data.date_birthday) data.date_birthday = moment(data.date_birthday).format('YYYY-MM-DD');

            // Add tenant_id and branch_id to customer data for data isolation
            if (user_tenant_id) {
                data.tenant_id = user_tenant_id;
            }
            if (user_branch_id) {
                data.branch_id = user_branch_id;
            }

            const check = await CustomerRepository.getByPhone(data.phone, user_tenant_id);
            if (check) throw new Error('Nomor telepon sudah terdaftar');

            const result = await CustomerRepository.create(data);

            let final_result = result.toJSON();
            if (data.password) delete final_result.password;

            return final_result;
        } catch (error) {
            throw new Error(error.message);
        }
    };

    /**
     * Pelanggan default untuk transaksi walk-in (tanpa data pelanggan).
     * Dipakai Quick Order agar `customer_id` tetap terisi.
     */
    static async getOrCreateWalkIn(user_tenant_id = null, user_branch_id = null) {
        if (!user_tenant_id) throw new Error('Tenant tidak ditemukan');
        return CustomerRepository.getOrCreateWalkIn(user_tenant_id, user_branch_id);
    }

    static async getAll(search, user_tenant_id = null, user_branch_id = null, user_role = null, page = 1, limit = 10, branch_id = null, sort_by = 'newest') {
        try {
            const result = await CustomerRepository.getAll(search, user_tenant_id, user_branch_id, user_role, page, limit, branch_id, sort_by);
            
            return {
                customers: result.customers,
                pagination: {
                    currentPage: page,
                    totalPages: result.totalPages,
                    totalItems: result.totalItems,
                    itemsPerPage: limit,
                    hasNextPage: page < result.totalPages,
                    hasPrevPage: page > 1
                }
            };
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getAllWithMembership(search, user_tenant_id = null, user_branch_id = null, user_role = null, page = 1, limit = 10, branch_id = null, sort_by = 'newest') {
        try {
            const result = await CustomerRepository.getAllWithMembership(search, user_tenant_id, user_branch_id, user_role, page, limit, branch_id, sort_by);
            
            return {
                customers: result.customers,
                pagination: {
                    currentPage: page,
                    totalPages: result.totalPages,
                    totalItems: result.totalItems,
                    itemsPerPage: limit,
                    hasNextPage: page < result.totalPages,
                    hasPrevPage: page > 1
                }
            };
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getAllWithoutMembership(search, user_tenant_id = null, user_branch_id = null, user_role = null, page = 1, limit = 10, branch_id = null, sort_by = 'newest') {
        try {
            const result = await CustomerRepository.getAllWithoutMembership(search, user_tenant_id, user_branch_id, user_role, page, limit, branch_id, sort_by);
            
            return {
                customers: result.customers,
                pagination: {
                    currentPage: page,
                    totalPages: result.totalPages,
                    totalItems: result.totalItems,
                    itemsPerPage: limit,
                    hasNextPage: page < result.totalPages,
                    hasPrevPage: page > 1
                }
            };
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getAllCustomersFollowUp(user_tenant_id = null, user_branch_id = null, user_role = null) {
        try {
            const customers = await CustomerRepository.getAll(null, user_tenant_id, user_branch_id, user_role);
    
            let followUpData = [];
            for (const customer of customers) {
                const  totalTransactions = await CustomerRepository.calculateTotalTransactions(customer.id, user_tenant_id);

                let lastTransactionDate = await CustomerRepository.getLastTransactionDate(customer.id, user_tenant_id);
                lastTransactionDate = lastTransactionDate.length > 0 
                    ? lastTransactionDate[0].entry_date : null;

                const daysSinceLastTransaction = lastTransactionDate 
                    ? Math.floor(
                        (new Date() - new Date(lastTransactionDate)) / (1000 * 60 * 60 * 24)
                    ) : null;
    
                const customerData = customer.toJSON();
                if (customerData.password) delete customerData.password;
    
                followUpData.push({
                    customerId: customer.id,
                    customerName: customer.name,
                    totalTransactions,
                    lastTransactionDate,
                    daysSinceLastTransaction,
                    customerData: customerData
                });
            }

            if (followUpData.length === 0) throw new Error('No customer found');

            followUpData.sort((a, b) => b.daysSinceLastTransaction - a.daysSinceLastTransaction);

            return followUpData;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async searchByName(name, user_tenant_id = null, user_branch_id = null, user_role = null, sort_by = 'newest') {
        try {
            const result = await CustomerRepository.searchByName(name, user_tenant_id, user_branch_id, user_role, sort_by);
            
            // Return empty array jika tidak ada hasil (jangan throw error)
            if (!result || result.length === 0) {
                return [];
            }

            return result;
        } catch (error) {
            // Jika error dari repository (misal: search parameter required), throw error
            // Tapi jika hanya tidak ada hasil, return empty array
            if (error.message === 'Search parameter is required') {
                throw new Error(error.message);
            }
            // Return empty array untuk error lainnya (bukan throw error)
            console.error('CustomerService.searchByName error:', error);
            return [];
        }
    }

    static async getById(id, user_tenant_id = null, user_branch_id = null, user_role = null) {
        try {
            if (isNaN(id) || id <= 0) throw new Error('Invalid ID');

            const result = await CustomerRepository.getById(id, user_tenant_id, user_branch_id, user_role);
            if (!result) throw new Error('Customer not found');

            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }
    
    static async update(data, user_tenant_id = null, user_branch_id = null, user_role = null) {
        try {
            if (isNaN(data.id) || data.id <= 0) throw new Error('Invalid ID');

            const check = await CustomerRepository.getById(data.id, user_tenant_id, user_branch_id, user_role);
            if (!check) throw new Error('Customer not found');

            if (data.password) {
                const salt = await bcrypt.genSalt(10);
                data.password = await bcrypt.hash(data.password, salt);
            }

            if (data.phone) {
                const normalizePhone = (p) => p ? p.replace(/\D/g, '').replace(/^62/, '').replace(/^0/, '') : '';
                const isSamePhone = normalizePhone(data.phone) === normalizePhone(check.phone);
                if (!isSamePhone) {
                    const phone = await CustomerRepository.getByPhone(data.phone, user_tenant_id);
                    if (phone) throw new Error('Nomor telepon sudah terdaftar');
                }
            }

            if (data.date_birthday) data.date_birthday = moment(data.date_birthday).format('YYYY-MM-DD');

            const result = await CustomerRepository.update(data.id, data);
        
            let final_result = result.toJSON();
            if (data.password) delete final_result.password;

            return final_result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async delete(id, user_tenant_id = null, user_branch_id = null, user_role = null) {
        try {
            if (isNaN(id) || id <= 0) throw new Error('Invalid ID');

            // ✅ ISOLASI TENANT: tenant_id HANYA boleh berasal dari token
            // (req.user.tenant_id). Nilai tenant_id dari params/body/query
            // tidak pernah dipercaya.
            if (user_tenant_id === null || user_tenant_id === undefined || user_tenant_id === '') {
                throw new Error('Unauthorized: tenant tidak ditemukan pada token');
            }

            const check = await CustomerRepository.getById(id, user_tenant_id, user_branch_id, user_role);
            if (!check) throw new Error('Customer not found');

            // ✅ DOUBLE CHECK: customer wajib milik tenant pemilik token
            if (Number(check.tenant_id) !== Number(user_tenant_id)) {
                throw new Error('Access denied: customer bukan milik tenant Anda');
            }

            // 1. Hapus membership customer + reverse finance pembelian membership (jika ada payment)
            const MembershipPaymentService = require('./membershipPaymentService');
            const memberships = await CustomerRepository.getCustomerMembershipsByCustomerId(id, user_tenant_id);

            let deletedMemberships = 0;
            for (const membership of memberships) {
                if (membership.payment_id) {
                    // Reuse logic existing: reverse saldo akun finance, soft delete payment & payment details
                    await MembershipPaymentService.delete(membership.id, user_tenant_id, user_branch_id);
                }
                deletedMemberships++;
            }

            // 2. Hapus semua order milik customer ini.
            //    OrderService.delete sudah menangani:
            //    - reverse saldo akun keuangan + soft delete finance transaction
            //    - reverse poin (earned / redeem / bonus)
            //    - soft delete payment & payment details
            //    - soft delete order & point transactions order terkait
            const OrderService = require('./orderService');
            const orders = await CustomerRepository.getOrdersByCustomerId(id, user_tenant_id);

            let deletedOrders = 0;
            for (const order of orders) {
                await OrderService.delete(
                    order.id,
                    order.tenant_id || user_tenant_id,
                    order.branch_id || user_branch_id
                );
                deletedOrders++;
            }

            // 3. Hapus sisa data turunan customer
            //    (membership tanpa payment, poin, reminder, followup, campaign, dll)
            await CustomerRepository.deleteRelatedData(id, user_tenant_id);

            // 4. Soft delete customer (dibatasi tenant dari token)
            await CustomerRepository.delete(id, user_tenant_id);

            return {
                customer_id: id,
                deleted_orders: deletedOrders,
                deleted_memberships: deletedMemberships
            };
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getDormantCustomers(daysSinceLastOrder = 14, user_tenant_id = null, user_branch_id = null, user_role = null, page = 1, limit = 10) {
        try {
            const result = await CustomerRepository.getDormantCustomers(daysSinceLastOrder, user_tenant_id, user_branch_id, user_role, page, limit);
            
            return {
                customers: result.customers,
                pagination: {
                    currentPage: page,
                    totalPages: result.totalPages,
                    totalItems: result.totalItems,
                    itemsPerPage: limit,
                    hasNextPage: page < result.totalPages,
                    hasPrevPage: page > 1
                },
                summary: {
                    daysSinceLastOrder: daysSinceLastOrder,
                    totalDormantCustomers: result.totalItems
                }
            };
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getDormantCustomersByPeriod(user_tenant_id = null, user_branch_id = null, user_role = null) {
        try {
            const result = await CustomerRepository.getDormantCustomersByPeriod(user_tenant_id, user_branch_id, user_role);
            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getDormantCustomersByPeriodRange(period, user_tenant_id = null, user_branch_id = null, user_role = null, page = 1, limit = 10) {
        try {
            const result = await CustomerRepository.getDormantCustomersByPeriodRange(period, user_tenant_id, user_branch_id, user_role, page, limit);
            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async exportCustomers(search, user_tenant_id = null, user_branch_id = null, user_role = null, branch_id = null, membership_filter = 'all', sort_by = 'newest') {
        try {
            const result = await CustomerRepository.exportCustomers(search, user_tenant_id, user_branch_id, user_role, branch_id, membership_filter, sort_by);
            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    /**
     * Export customers data optimized - BARU!
     */
    static async exportCustomersOptimized(search, user_tenant_id = null, user_branch_id = null, user_role = null, branch_id = null, membership_filter = 'all', sort_by = 'newest') {
        try {
            const result = await CustomerRepository.exportCustomersOptimized(search, user_tenant_id, user_branch_id, user_role, branch_id, membership_filter, sort_by);
            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    static async getReferralStats(customer_id, user_tenant_id = null) {
        try {
            const result = await CustomerRepository.getReferralStats(customer_id, user_tenant_id);
            return result;
        } catch (error) {
            throw new Error(error.message);
        }
    }

    /**
     * Import customers from CSV file
     * @param {string} filePath - Path to uploaded CSV file
     * @param {number} user_tenant_id - Tenant ID from user context
     * @param {number} user_branch_id - Branch ID from user context
     * @param {string} user_role - User role
     * @returns {object} - Import result with success/failed/skipped counts and errors
     */
    static async importCustomers(filePath, user_tenant_id = null, user_branch_id = null, user_role = null) {
        const fs = require('fs');
        const csv = require('csv-parser');
        const { cleanPhoneNumber } = require('../helpers/phoneHelper');
        
        return new Promise((resolve, reject) => {
            const results = {
                total_rows: 0,
                success_count: 0,
                failed_count: 0,
                skipped_count: 0,
                errors: [],
                warnings: []
            };

            const validCustomers = [];
            const processedPhones = new Set(); // Track phones in current file to detect duplicates
            const duplicateCheckPromises = []; // Store promises for duplicate checks

            if (!fs.existsSync(filePath)) {
                return reject(new Error('File tidak ditemukan'));
            }

            const stream = fs.createReadStream(filePath)
                .pipe(csv())
                .on('data', (row) => {
                    results.total_rows++;
                    const rowNumber = results.total_rows;

                    try {
                        // Normalize column names (case-insensitive, handle spaces)
                        const normalizedRow = {};
                        Object.keys(row).forEach(key => {
                            const normalizedKey = key.trim().toLowerCase();
                            normalizedRow[normalizedKey] = row[key] ? row[key].trim() : '';
                        });

                        // Extract fields (support multiple column name variations)
                        const name = normalizedRow['nama'] || normalizedRow['name'] || '';
                        const phone = normalizedRow['telepon'] || normalizedRow['phone'] || normalizedRow['nomor'] || normalizedRow['hp'] || '';
                        const address = normalizedRow['alamat'] || normalizedRow['address'] || '';

                        // Validate required fields
                        if (!name || name.length < 2) {
                            results.failed_count++;
                            results.errors.push({
                                row: rowNumber,
                                field: 'nama',
                                value: name,
                                message: 'Nama wajib diisi dan minimal 2 karakter'
                            });
                            return;
                        }

                        if (name.length > 100) {
                            results.failed_count++;
                            results.errors.push({
                                row: rowNumber,
                                field: 'nama',
                                value: name,
                                message: 'Nama maksimal 100 karakter'
                            });
                            return;
                        }

                        if (!phone || phone.trim() === '') {
                            results.failed_count++;
                            results.errors.push({
                                row: rowNumber,
                                field: 'telepon',
                                value: phone,
                                message: 'Nomor telepon wajib diisi'
                            });
                            return;
                        }

                        // Clean and validate phone
                        const cleanedPhone = cleanPhoneNumber(phone);
                        if (!cleanedPhone || cleanedPhone.length < 10 || cleanedPhone.length > 15) {
                            results.failed_count++;
                            results.errors.push({
                                row: rowNumber,
                                field: 'telepon',
                                value: phone,
                                message: 'Format nomor telepon tidak valid (min 10, max 15 digit)'
                            });
                            return;
                        }

                        // Check duplicate in current file
                        if (processedPhones.has(cleanedPhone)) {
                            results.skipped_count++;
                            results.warnings.push({
                                row: rowNumber,
                                field: 'telepon',
                                value: phone,
                                message: 'Nomor telepon duplikat dalam file yang sama'
                            });
                            return;
                        }

                        processedPhones.add(cleanedPhone);

                        // Validate address length if provided
                        if (address && address.length > 500) {
                            results.failed_count++;
                            results.errors.push({
                                row: rowNumber,
                                field: 'alamat',
                                value: address.substring(0, 50) + '...',
                                message: 'Alamat maksimal 500 karakter'
                            });
                            return;
                        }

                        // Store promise for duplicate check in database
                        const duplicateCheckPromise = CustomerRepository.getByPhone(cleanedPhone, user_tenant_id)
                            .then(existingCustomer => {
                                if (existingCustomer) {
                                    results.skipped_count++;
                                    results.warnings.push({
                                        row: rowNumber,
                                        field: 'telepon',
                                        value: phone,
                                        message: 'Nomor telepon sudah terdaftar di database'
                                    });
                                    return null;
                                }

                                // Prepare customer data
                                const customerData = {
                                    name: name,
                                    phone: cleanedPhone,
                                    address: address || null,
                                    tenant_id: user_tenant_id,
                                    branch_id: user_branch_id || null
                                };

                                return customerData;
                            })
                            .catch(error => {
                                results.failed_count++;
                                results.errors.push({
                                    row: rowNumber,
                                    field: 'general',
                                    value: '',
                                    message: error.message || 'Error checking duplicate'
                                });
                                return null;
                            });

                        duplicateCheckPromises.push(duplicateCheckPromise);

                    } catch (error) {
                        results.failed_count++;
                        results.errors.push({
                            row: rowNumber,
                            field: 'general',
                            value: '',
                            message: error.message || 'Error processing row'
                        });
                    }
                })
                .on('end', async () => {
                    try {
                        // Wait for all duplicate checks to complete
                        const customerDataResults = await Promise.all(duplicateCheckPromises);
                        
                        // Filter out null values (skipped duplicates)
                        const customersToInsert = customerDataResults.filter(data => data !== null);

                        // Bulk insert valid customers
                        if (customersToInsert.length > 0) {
                            const inserted = await CustomerRepository.bulkCreate(customersToInsert, user_tenant_id);
                            results.success_count = inserted.length;
                        }

                        // Cleanup temp file
                        try {
                            fs.unlinkSync(filePath);
                        } catch (unlinkError) {
                            console.error('Error deleting temp file:', unlinkError);
                        }

                        resolve(results);
                    } catch (error) {
                        // Cleanup temp file even on error
                        try {
                            fs.unlinkSync(filePath);
                        } catch (unlinkError) {
                            console.error('Error deleting temp file:', unlinkError);
                        }
                        reject(new Error(error.message));
                    }
                })
                .on('error', (error) => {
                    // Cleanup temp file on stream error
                    try {
                        fs.unlinkSync(filePath);
                    } catch (unlinkError) {
                        console.error('Error deleting temp file:', unlinkError);
                    }
                    reject(new Error('Error reading CSV file: ' + error.message));
                });
        });
    }
};

module.exports = CustomerService;