# FCRA Compliance Guide for Tenant Screening

This guide outlines FCRA (Fair Credit Reporting Act) compliance requirements for tenant screening in PropVestor.

## Overview

When using tenant screening services like RentSpree, you must comply with FCRA regulations, especially when making adverse decisions based on screening reports.

## Key FCRA Requirements

### 1. Adverse Action Notices

**When Required:**
- When you deny an applicant based on information in a screening report
- When you require additional conditions (e.g., higher deposit) based on screening
- When you approve but on less favorable terms than standard

**Required Information:**
- Name and contact information of the credit reporting agency
- Statement that the agency didn't make the decision
- Right to obtain a free copy of the report within 60 days
- Right to dispute inaccurate information

### 2. Pre-Adverse Action Notice (Optional but Recommended)

Before sending a final adverse action notice, you may want to send a pre-adverse action notice giving the applicant time to review and dispute information.

### 3. Disclosure and Authorization

Before requesting a screening report, you must:
- Obtain written authorization from the applicant
- Provide clear disclosure that a screening report will be obtained
- Explain how the information will be used

## Implementation in PropVestor

### Adverse Action Notice Endpoint

```
POST /api/screening/:id/adverse-action
```

This endpoint:
- Marks the adverse action as sent
- Records the timestamp
- Should trigger an email with FCRA-compliant language

### Email Template Requirements

When sending adverse action notices, include:

1. **Clear Statement:**
   "We regret to inform you that your application has been denied based on information in your tenant screening report."

2. **Credit Reporting Agency Information:**
   - Name: [RentSpree or their reporting agency]
   - Address: [Contact information]
   - Phone: [Contact number]

3. **Rights Statement:**
   - Right to obtain a free copy of the report within 60 days
   - Right to dispute inaccurate information
   - Contact information for disputes

4. **Decision Factors:**
   - Credit score below threshold
   - Eviction history
   - Criminal history
   - Income verification failure
   - Other factors (be specific)

### Sample Adverse Action Email

```
Subject: Important Information About Your Rental Application

Dear [Applicant Name],

We regret to inform you that your rental application for [Property Address] has been denied based on information contained in your tenant screening report.

The credit reporting agency that provided the information is:
[RentSpree / Agency Name]
[Address]
[Phone]

This agency did not make the decision to deny your application and cannot explain why the decision was made.

You have the right to:
1. Obtain a free copy of your screening report within 60 days
2. Dispute any inaccurate information in the report

To obtain your free report or file a dispute, contact:
[RentSpree / Agency Contact Information]

The specific factors that contributed to this decision include:
- [List specific factors, e.g., "Credit score below 600", "Eviction history found"]

If you have questions about this decision, please contact us at [Your Contact Information].

Sincerely,
[Your Organization Name]
```

## State-Specific Requirements

Some states have additional requirements:

- **California:** Additional disclosure requirements
- **New York:** Specific notice language required
- **Massachusetts:** Additional consumer rights

**Important:** Consult with legal counsel to ensure compliance with all applicable state and local laws.

## Best Practices

1. **Document Everything:**
   - Keep records of all adverse action notices sent
   - Maintain timestamps and delivery confirmations
   - Store copies of screening reports

2. **Consistent Criteria:**
   - Apply screening criteria consistently to all applicants
   - Document your screening criteria in writing
   - Avoid discriminatory practices

3. **Timely Notices:**
   - Send adverse action notices promptly after decision
   - Comply with FCRA timing requirements (typically within 3-5 business days)

4. **Secure Storage:**
   - Store screening reports securely
   - Limit access to authorized personnel only
   - Comply with data retention requirements

5. **Regular Review:**
   - Review and update your screening criteria regularly
   - Ensure all staff are trained on FCRA compliance
   - Audit adverse action notices periodically

## Integration with RentSpree

RentSpree typically provides:
- FCRA-compliant screening reports
- Adverse action notice templates
- Compliance guidance

However, **you are still responsible for:**
- Sending adverse action notices
- Maintaining compliance records
- Ensuring your processes meet all requirements

## Testing

Before going live:
1. Test the adverse action notice flow
2. Verify email delivery
3. Review email content with legal counsel
4. Test with sample screening results

## Resources

- [FTC: Using Consumer Reports](https://www.ftc.gov/business-guidance/resources/using-consumer-reports-what-landlords-need-know)
- [FCRA Text](https://www.ftc.gov/legal-library/browse/statutes/fair-credit-reporting-act)
- RentSpree Compliance Documentation (check their website)

## Disclaimer

This guide provides general information only and does not constitute legal advice. Always consult with qualified legal counsel to ensure full compliance with FCRA and all applicable laws.

