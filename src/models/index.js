const sequelize = require('../config/database');
const { Op } = require('sequelize');

const Absent = require('./Absent');
const AdminNote = require('./AdminNote');
// const Ai = require('./Ai');
const Branch = require('./Branch');
const BranchMitraRelation = require('./BranchMitraRelation');
// const Business = require('./Business');
// const CapitalRecord = require('./CapitalRecord');
// const Collaboration = require('./Collaboration');
const Customer = require('./Customer');
const Delivery = require('./Delivery');
const DeliveryDetail = require('./DeliveryDetail');
const Discount = require('./Discount');
const Expense = require('./Expense');
const Income = require('./Income');
const FinanceAccount = require('./FinanceAccount');
const FinanceCategory = require('./FinanceCategory');
const FinanceTransaction = require('./FinanceTransaction');
const Item = require('./Item');
const Lead = require('./Lead');
const LeadRecord = require('./LeadRecord');
const Membership = require('./Membership');
const CustomerMembership = require('./CustomerMembership');
const CustomerFollowup = require('./CustomerFollowup');
const Order = require('./Order');
const OrderDetail = require('./OrderDetail');
// const OrderProduct = require('./OrderProduct');
// const OrderProductDetail = require('./OrderProductDetail');
const Payment = require('./Payment');
const PaymentDetail = require('./PaymentDetail');
const PaymentLog = require('./PaymentLog');
const PaymentMethod = require('./PaymentMethod');
const PointTransaction = require('./PointTransaction');
// const Product = require('./Product');
const Shift = require('./Shift');
const ShoePhoto = require('./ShoesPhoto');
const Treatment = require('./Treatment');
const ProductCategory = require('./ProductCategory');
const TreatmentStock = require('./TreatmentStock');
const StockMovement = require('./StockMovement');
const User = require('./User');
const OrderDetailStatusLog = require('./OrderDetailStatusLog');
const ItemStatusPhoto = require('./ItemStatusPhoto');
const InvoiceToken = require('./InvoiceToken');
const InvoiceAccessLog = require('./InvoiceAccessLog');
const ReminderLog = require('./ReminderLog');
const Tenant = require('./Tenant');
const SubscriptionPlan = require('./SubscriptionPlan');
const Subscription = require('./Subscription');
const TenantPayment = require('./TenantPayment');
const WaSession = require('./WaSession');
const WaConnection = require('./WaConnection');
const Printer = require('./Printer');
const WhatsAppTemplate = require('./WhatsAppTemplate');
const TenantOnboarding = require('./TenantOnboarding');
const FollowupSequence = require('./FollowupSequence');
const FollowupSequenceTemplate = require('./FollowupSequenceTemplate');
const CustomerFollowupSequence = require('./CustomerFollowupSequence');
const FollowupUsageLimit = require('./FollowupUsageLimit');
const TenantLimitsConfig = require('./TenantLimitsConfig');
const MessageQueue = require('./MessageQueue');
const AiCredit = require('./AiCredit');
const AiCreditPackage = require('./AiCreditPackage');
const Campaign = require('./Campaign');
const CampaignCustomer = require('./CampaignCustomer');
const Feedback = require('./Feedback');
const BugReport = require('./BugReport');
const AppVersion = require('./AppVersion');
const RefreshToken = require('./RefreshToken');
const TagSequence = require('./TagSequence');
const TaskTemplate = require('./TaskTemplate');
const DailyTask = require('./DailyTask');
const WorkSchedule = require('./WorkSchedule');
const WorkScheduleDay = require('./WorkScheduleDay');
const Holiday = require('./Holiday');


const models = {
    Absent,
    AdminNote,
    AiCredit,
    AiCreditPackage,
    // Ai,
    Branch,
    BranchMitraRelation,
    // Business,
    // CapitalRecord,
    // Collaboration,
    Customer,
    Delivery,
    DeliveryDetail,
    Discount,
    Expense,
    Income,
    FinanceAccount,
    FinanceCategory,
    FinanceTransaction,
    Item,
    Lead,
    LeadRecord,
    Membership,
    CustomerMembership,
    CustomerFollowup,
    Order,
    OrderDetail,
    // OrderProduct,
    // OrderProductDetail,
    Payment,
    PaymentDetail,
    PaymentLog,
    PaymentMethod,
    PointTransaction,
    // Product,
    Shift,
    ShoePhoto,
    Treatment,
    ProductCategory,
    TreatmentStock,
    StockMovement,
    User,
    OrderDetailStatusLog,
    ItemStatusPhoto,
    InvoiceToken,
    InvoiceAccessLog,
    ReminderLog,
    Tenant,
    SubscriptionPlan,
    Subscription,
    TenantPayment,
    WaSession,
    WaConnection,
    Printer,
    WhatsAppTemplate,
    TenantOnboarding,
    FollowupSequence,
    FollowupSequenceTemplate,
    CustomerFollowupSequence,
    FollowupUsageLimit,
    TenantLimitsConfig,
    MessageQueue,
    Campaign,
    CampaignCustomer,
    Feedback,
    BugReport,
    AppVersion,
    RefreshToken,
    TagSequence,
    TaskTemplate,
    DailyTask,
    WorkSchedule,
    WorkScheduleDay,
    Holiday,
};

Object.values(models).forEach(model => {
    if (model.associate) {
        model.associate(models);
    }
});

module.exports = {
    Absent,
    TaskTemplate,
    DailyTask,
    WorkSchedule,
    WorkScheduleDay,
    Holiday,
    AdminNote,
    AiCredit,
    AiCreditPackage,
    // Ai,
    Branch,
    BranchMitraRelation,
    // Business,
    // CapitalRecord,
    // Collaboration,
    Customer,
    Delivery,
    DeliveryDetail,
    Discount,
    Expense,
    Income,
    FinanceAccount,
    FinanceCategory,
    FinanceTransaction,
    Item,
    Lead,
    LeadRecord,
    Membership,
    CustomerMembership,
    CustomerFollowup,
    Order,
    OrderDetail,
    // OrderProduct,
    // OrderProductDetail,
    Payment,
    PaymentDetail,
    PaymentLog,
    PaymentMethod,
    PointTransaction,
    // Product,
    Shift,
    ShoePhoto,
    Treatment,
    ProductCategory,
    TreatmentStock,
    StockMovement,
    User,
    Op,
    sequelize,
    OrderDetailStatusLog,
    ItemStatusPhoto,
    InvoiceToken,
    InvoiceAccessLog,
    ReminderLog,
    Tenant,
    SubscriptionPlan,
    Subscription,
    TenantPayment,
    WaSession,
    WaConnection,
    Printer,
    WhatsAppTemplate,
    TenantOnboarding,
    FollowupSequence,
    FollowupSequenceTemplate,
    CustomerFollowupSequence,
    FollowupUsageLimit,
    TenantLimitsConfig,
    MessageQueue,
    Campaign,
    CampaignCustomer,
    Feedback,
    BugReport,
    AppVersion,
    RefreshToken,
    TagSequence,
    TaskTemplate,
    DailyTask,
};