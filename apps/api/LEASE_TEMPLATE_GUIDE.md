# Lease Agreement Template Guide

## Template Location

Lease agreement templates are stored in:
```
apps/api/src/templates/
```

The default template is:
```
apps/api/src/templates/lease-agreement.hbs
```

## State-Specific Templates

The system automatically selects state-specific templates when available. Templates are named:
```
lease-agreement-{statecode}.hbs
```

For example:
- `lease-agreement-ca.hbs` - California
- `lease-agreement-ny.hbs` - New York
- `lease-agreement-tx.hbs` - Texas
- `lease-agreement-fl.hbs` - Florida

**How it works:**
1. When generating a PDF, the system checks the property's state
2. It looks for a state-specific template (e.g., `lease-agreement-ca.hbs` for California)
3. If found, uses that template; otherwise falls back to the default `lease-agreement.hbs`

**State Code Normalization:**
- Full state names (e.g., "California") are automatically converted to codes (e.g., "CA")
- State codes are case-insensitive (CA, ca, Ca all work)
- If no state-specific template exists, the default template is used

## Template Format

Templates use **Handlebars** syntax (`.hbs` files). This allows you to:
- Insert dynamic data using `{{variableName}}`
- Use conditionals with `{{#if condition}}...{{/if}}`
- Loop through arrays with `{{#each items}}...{{/each}}`
- Use helpers like `{{currency amount}}` and `{{date dateValue}}`

## Available Template Data

The template receives the following data structure:

```typescript
{
  // Organization
  organizationName: string;
  
  // Property & Unit
  propertyName: string;
  propertyAddress: string;  // Full formatted address
  unitName: string;
  state: string;  // State code (e.g., "CA", "NY", "TX")
  bedrooms?: number;
  bathrooms?: number;
  squareFeet?: number;
  
  // Lease Terms
  startDate: string;  // ISO date string
  endDate: string;    // ISO date string
  rentAmount: string; // Decimal as string
  depositAmount?: string;
  rentDueDay: number;  // Day of month (1-31)
  
  // Tenants
  tenants: Array<{
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    isPrimary: boolean;
  }>;
  
  // Dates
  generatedDate: string;  // Formatted date string
}
```

## Handlebars Helpers

The following helpers are available:

- `{{currency value}}` - Formats numbers as currency (e.g., `$1,500.00`)
- `{{date value}}` - Formats dates (e.g., `January 15, 2024`)

## How to Provide a Custom Template

### Option 1: Replace the Default Template

1. Edit `apps/api/src/templates/lease-agreement.hbs`
2. Modify the HTML/CSS to match your desired format
3. Use Handlebars syntax to insert dynamic data
4. The template will be used automatically

### Option 2: Create Multiple Templates

1. Create a new template file, e.g., `apps/api/src/templates/lease-agreement-custom.hbs`
2. When generating a PDF, specify the template name:
   ```typescript
   // In the API route, you can pass a template name
   const { storageKey, url } = await generateAndUploadLeasePdf(
     templateData,
     organizationId,
     leaseId,
     'lease-agreement-custom'  // Template name without .hbs extension
   );
   ```

### Option 3: Organization-Specific Templates

You can modify the code to support organization-specific templates:

1. Create templates like:
   - `lease-agreement-org1.hbs`
   - `lease-agreement-org2.hbs`

2. Update the lease route to select template based on organization:
   ```typescript
   const templateName = lease.organization.slug === 'org1' 
     ? 'lease-agreement-org1' 
     : 'lease-agreement';
   ```

## Template Example

Here's a simple example of template syntax:

```handlebars
<h1>Lease Agreement</h1>

<p>This lease is between <strong>{{organizationName}}</strong> and:</p>

{{#each tenants}}
  <p>{{firstName}} {{lastName}}{{#if isPrimary}} (Primary){{/if}}</p>
{{/each}}

<p>Property: {{propertyName}} - {{unitName}}</p>
<p>Address: {{propertyAddress}}</p>

<p>Rent: {{currency rentAmount}} per month</p>
<p>Due on day {{rentDueDay}} of each month</p>

{{#if depositAmount}}
<p>Security Deposit: {{currency depositAmount}}</p>
{{/if}}

<p>Term: {{date startDate}} to {{date endDate}}</p>
```

## Styling

Templates use standard HTML and CSS. The PDF is generated using Puppeteer, which supports:
- CSS Grid and Flexbox
- Print media queries
- Custom fonts (if embedded)
- Page breaks (`page-break-before`, `page-break-after`)

### PDF Settings

The PDF is generated with:
- Format: Letter (8.5" x 11")
- Margins: 0.5 inches on all sides
- Background: Printed (for colors/images)

## Testing Your Template

1. Create or edit your template file
2. Generate a PDF via the API:
   ```
   POST /api/leases/:id/generate-pdf
   ```
3. Check the generated PDF in Google Cloud Storage
4. Iterate on the template until satisfied

## Best Practices

1. **Keep it Legal**: Ensure your template includes all required legal clauses for your jurisdiction
2. **Test with Real Data**: Use actual lease data to verify formatting
3. **Print Preview**: Test how it looks when printed/PDF'd
4. **Signature Lines**: Include clear signature sections for all parties
5. **Page Breaks**: Use `page-break-inside: avoid` to keep sections together
6. **Fonts**: Use web-safe fonts or embed custom fonts in the template

## Adding Custom Fields

If you need additional fields in your template:

1. Update the `LeaseTemplateData` interface in `apps/api/src/lib/pdf.ts`
2. Update the template data preparation in `apps/api/src/routes/leases.ts`
3. Use the new fields in your template

Example:
```typescript
// In pdf.ts
export interface LeaseTemplateData {
  // ... existing fields
  customField?: string;  // Add your custom field
}

// In leases.ts route
const templateData: LeaseTemplateData = {
  // ... existing data
  customField: 'Your custom value',
};
```

## Template Variables Reference

| Variable | Type | Description |
|----------|------|-------------|
| `organizationName` | string | Name of the organization/landlord |
| `propertyName` | string | Name of the property |
| `propertyAddress` | string | Full formatted address |
| `unitName` | string | Unit name/number |
| `state` | string | State code (e.g., "CA", "NY", "TX") - used for template selection |
| `bedrooms` | number? | Number of bedrooms (optional) |
| `bathrooms` | number? | Number of bathrooms (optional) |
| `squareFeet` | number? | Square footage (optional) |
| `startDate` | string | Lease start date (ISO format) |
| `endDate` | string | Lease end date (ISO format) |
| `rentAmount` | string | Monthly rent amount (as string) |
| `depositAmount` | string? | Security deposit (optional) |
| `rentDueDay` | number | Day of month rent is due (1-31) |
| `tenants` | array | Array of tenant objects |
| `tenants[].firstName` | string | Tenant first name |
| `tenants[].lastName` | string | Tenant last name |
| `tenants[].email` | string? | Tenant email (optional) |
| `tenants[].phone` | string? | Tenant phone (optional) |
| `tenants[].isPrimary` | boolean | Whether tenant is primary |
| `generatedDate` | string | Date the PDF was generated |

## Creating State-Specific Templates

To create a state-specific template:

1. **Create the template file:**
   ```
   apps/api/src/templates/lease-agreement-{statecode}.hbs
   ```
   Example: `lease-agreement-ca.hbs` for California

2. **Use the same Handlebars variables** as the default template

3. **Add state-specific legal clauses** as needed:
   - State-specific notice requirements
   - Local rent control references
   - State-specific security deposit laws
   - Warranty of habitability language
   - State-specific default/eviction procedures

4. **The system will automatically use it** when generating PDFs for properties in that state

### Example State Templates Included

- `lease-agreement-ca.hbs` - California template with CA-specific clauses
- `lease-agreement-ny.hbs` - New York template with NY-specific clauses

You can use these as examples for creating templates for other states.

## Need Help?

- Handlebars documentation: https://handlebarsjs.com/
- Puppeteer PDF options: https://pptr.dev/api/puppeteer.page.pdf
- Current template: `apps/api/src/templates/lease-agreement.hbs`

