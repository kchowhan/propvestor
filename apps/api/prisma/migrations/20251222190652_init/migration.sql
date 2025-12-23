-- DropForeignKey
ALTER TABLE "OrganizationMembership" DROP CONSTRAINT "OrganizationMembership_userId_fkey";

-- DropForeignKey
ALTER TABLE "OrganizationMembership" DROP CONSTRAINT "OrganizationMembership_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "Property" DROP CONSTRAINT "Property_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "Unit" DROP CONSTRAINT "Unit_propertyId_fkey";

-- DropForeignKey
ALTER TABLE "Tenant" DROP CONSTRAINT "Tenant_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "Lease" DROP CONSTRAINT "Lease_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "Lease" DROP CONSTRAINT "Lease_unitId_fkey";

-- DropForeignKey
ALTER TABLE "LeaseTenant" DROP CONSTRAINT "LeaseTenant_leaseId_fkey";

-- DropForeignKey
ALTER TABLE "LeaseTenant" DROP CONSTRAINT "LeaseTenant_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Charge" DROP CONSTRAINT "Charge_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "Charge" DROP CONSTRAINT "Charge_propertyId_fkey";

-- DropForeignKey
ALTER TABLE "Charge" DROP CONSTRAINT "Charge_unitId_fkey";

-- DropForeignKey
ALTER TABLE "Charge" DROP CONSTRAINT "Charge_leaseId_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_leaseId_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_chargeId_fkey";

-- DropForeignKey
ALTER TABLE "WorkOrder" DROP CONSTRAINT "WorkOrder_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "WorkOrder" DROP CONSTRAINT "WorkOrder_propertyId_fkey";

-- DropForeignKey
ALTER TABLE "WorkOrder" DROP CONSTRAINT "WorkOrder_unitId_fkey";

-- DropForeignKey
ALTER TABLE "WorkOrder" DROP CONSTRAINT "WorkOrder_requestedByTenantId_fkey";

-- DropForeignKey
ALTER TABLE "WorkOrder" DROP CONSTRAINT "WorkOrder_assignedVendorId_fkey";

-- DropForeignKey
ALTER TABLE "Vendor" DROP CONSTRAINT "Vendor_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "Document" DROP CONSTRAINT "Document_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "Document" DROP CONSTRAINT "Document_propertyId_fkey";

-- DropForeignKey
ALTER TABLE "Document" DROP CONSTRAINT "Document_unitId_fkey";

-- DropForeignKey
ALTER TABLE "Document" DROP CONSTRAINT "Document_leaseId_fkey";

-- DropForeignKey
ALTER TABLE "Document" DROP CONSTRAINT "Document_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Document" DROP CONSTRAINT "Document_uploadedByUserId_fkey";

-- DropForeignKey
ALTER TABLE "Investor" DROP CONSTRAINT "Investor_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "InvestmentEntity" DROP CONSTRAINT "InvestmentEntity_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "Ownership" DROP CONSTRAINT "Ownership_investmentEntityId_fkey";

-- DropForeignKey
ALTER TABLE "Ownership" DROP CONSTRAINT "Ownership_investorId_fkey";

-- DropForeignKey
ALTER TABLE "Ownership" DROP CONSTRAINT "Ownership_propertyId_fkey";

-- DropForeignKey
ALTER TABLE "CapitalContribution" DROP CONSTRAINT "CapitalContribution_investmentEntityId_fkey";

-- DropForeignKey
ALTER TABLE "CapitalContribution" DROP CONSTRAINT "CapitalContribution_investorId_fkey";

-- DropForeignKey
ALTER TABLE "Distribution" DROP CONSTRAINT "Distribution_investmentEntityId_fkey";

-- DropForeignKey
ALTER TABLE "Distribution" DROP CONSTRAINT "Distribution_investorId_fkey";

-- DropForeignKey
ALTER TABLE "ValuationSnapshot" DROP CONSTRAINT "ValuationSnapshot_investmentEntityId_fkey";

-- DropForeignKey
ALTER TABLE "ValuationSnapshot" DROP CONSTRAINT "ValuationSnapshot_propertyId_fkey";

-- DropTable
DROP TABLE "User";

-- DropTable
DROP TABLE "Organization";

-- DropTable
DROP TABLE "OrganizationMembership";

-- DropTable
DROP TABLE "Property";

-- DropTable
DROP TABLE "Unit";

-- DropTable
DROP TABLE "Tenant";

-- DropTable
DROP TABLE "Lease";

-- DropTable
DROP TABLE "LeaseTenant";

-- DropTable
DROP TABLE "Charge";

-- DropTable
DROP TABLE "Payment";

-- DropTable
DROP TABLE "WorkOrder";

-- DropTable
DROP TABLE "Vendor";

-- DropTable
DROP TABLE "Document";

-- DropTable
DROP TABLE "Investor";

-- DropTable
DROP TABLE "InvestmentEntity";

-- DropTable
DROP TABLE "Ownership";

-- DropTable
DROP TABLE "CapitalContribution";

-- DropTable
DROP TABLE "Distribution";

-- DropTable
DROP TABLE "ValuationSnapshot";

-- DropEnum
DROP TYPE "OrganizationRole";

-- DropEnum
DROP TYPE "PropertyType";

-- DropEnum
DROP TYPE "PropertyStatus";

-- DropEnum
DROP TYPE "UnitStatus";

-- DropEnum
DROP TYPE "LeaseStatus";

-- DropEnum
DROP TYPE "ChargeType";

-- DropEnum
DROP TYPE "ChargeStatus";

-- DropEnum
DROP TYPE "PaymentMethod";

-- DropEnum
DROP TYPE "WorkOrderPriority";

-- DropEnum
DROP TYPE "WorkOrderStatus";

-- DropEnum
DROP TYPE "InvestmentEntityType";

