'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add composite index for tenant_id + branch_id (most common query pattern)
    await queryInterface.addIndex('orders', ['tenant_id', 'branch_id'], {
      name: 'idx_orders_tenant_branch',
      comment: 'Composite index for filtering orders by tenant and branch'
    });

    // Add composite index for tenant_id + entry_date (date range queries)
    await queryInterface.addIndex('orders', ['tenant_id', 'entry_date'], {
      name: 'idx_orders_tenant_date',
      comment: 'Composite index for filtering orders by tenant and date range'
    });

    // Add composite index for branch_id + entry_date (branch-specific date queries)
    await queryInterface.addIndex('orders', ['branch_id', 'entry_date'], {
      name: 'idx_orders_branch_date',
      comment: 'Composite index for filtering orders by branch and date range'
    });

    // Add composite index for tenant_id + branch_id + entry_date (most specific query)
    await queryInterface.addIndex('orders', ['tenant_id', 'branch_id', 'entry_date'], {
      name: 'idx_orders_tenant_branch_date',
      comment: 'Composite index for filtering orders by tenant, branch, and date'
    });

    // Add index for order_type (filtering by order type)
    await queryInterface.addIndex('orders', ['order_type'], {
      name: 'idx_orders_order_type',
      comment: 'Index for filtering orders by type (regular, same_day, next_day)'
    });

    // Add composite index for tenant_id + order_type (tenant-specific order type filtering)
    await queryInterface.addIndex('orders', ['tenant_id', 'order_type'], {
      name: 'idx_orders_tenant_type',
      comment: 'Composite index for filtering orders by tenant and order type'
    });

    // Add composite index for branch_id + order_type (branch-specific order type filtering)
    await queryInterface.addIndex('orders', ['branch_id', 'order_type'], {
      name: 'idx_orders_branch_type',
      comment: 'Composite index for filtering orders by branch and order type'
    });

    // Add index for created_by (filtering by creator)
    await queryInterface.addIndex('orders', ['created_by'], {
      name: 'idx_orders_created_by',
      comment: 'Index for filtering orders by creator'
    });

    // Add composite index for tenant_id + created_by (tenant-specific creator filtering)
    await queryInterface.addIndex('orders', ['tenant_id', 'created_by'], {
      name: 'idx_orders_tenant_creator',
      comment: 'Composite index for filtering orders by tenant and creator'
    });

    // Add index for shift_id (filtering by shift)
    await queryInterface.addIndex('orders', ['shift_id'], {
      name: 'idx_orders_shift_id',
      comment: 'Index for filtering orders by shift'
    });

    // Add composite index for tenant_id + shift_id (tenant-specific shift filtering)
    await queryInterface.addIndex('orders', ['tenant_id', 'shift_id'], {
      name: 'idx_orders_tenant_shift',
      comment: 'Composite index for filtering orders by tenant and shift'
    });

    // Add index for entry_date (date-only filtering)
    await queryInterface.addIndex('orders', ['entry_date'], {
      name: 'idx_orders_entry_date',
      comment: 'Index for filtering orders by entry date'
    });

    // Add composite index for tenant_id + branch_id + order_type + entry_date (comprehensive filtering)
    await queryInterface.addIndex('orders', ['tenant_id', 'branch_id', 'order_type', 'entry_date'], {
      name: 'idx_orders_comprehensive',
      comment: 'Comprehensive composite index for complex filtering scenarios'
    });

    // Add index for deletedAt (soft delete queries)
    await queryInterface.addIndex('orders', ['deletedAt'], {
      name: 'idx_orders_deleted_at',
      comment: 'Index for soft delete queries'
    });

    // Add composite index for tenant_id + deletedAt (tenant-specific soft delete)
    await queryInterface.addIndex('orders', ['tenant_id', 'deletedAt'], {
      name: 'idx_orders_tenant_deleted',
      comment: 'Composite index for tenant-specific soft delete queries'
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove all indexes in reverse order
    await queryInterface.removeIndex('orders', 'idx_orders_tenant_deleted');
    await queryInterface.removeIndex('orders', 'idx_orders_deleted_at');
    await queryInterface.removeIndex('orders', 'idx_orders_comprehensive');
    await queryInterface.removeIndex('orders', 'idx_orders_entry_date');
    await queryInterface.removeIndex('orders', 'idx_orders_tenant_shift');
    await queryInterface.removeIndex('orders', 'idx_orders_shift_id');
    await queryInterface.removeIndex('orders', 'idx_orders_tenant_creator');
    await queryInterface.removeIndex('orders', 'idx_orders_created_by');
    await queryInterface.removeIndex('orders', 'idx_orders_branch_type');
    await queryInterface.removeIndex('orders', 'idx_orders_tenant_type');
    await queryInterface.removeIndex('orders', 'idx_orders_order_type');
    await queryInterface.removeIndex('orders', 'idx_orders_tenant_branch_date');
    await queryInterface.removeIndex('orders', 'idx_orders_branch_date');
    await queryInterface.removeIndex('orders', 'idx_orders_tenant_date');
    await queryInterface.removeIndex('orders', 'idx_orders_tenant_branch');
  }
};