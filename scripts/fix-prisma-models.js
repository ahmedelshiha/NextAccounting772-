const fs = require('fs');
const path = require('path');
const glob = require('glob');

const map = {
  'user': 'users',
  'post': 'posts',
  'booking': 'bookings',
  'service': 'services',
  'teamMember': 'team_members',
  'language': 'languages',
  'customRole': 'custom_roles',
  'serviceRequest': 'service_requests',
  'auditLog': 'audit_logs',
  'contactSubmission': 'contact_submissions',
  'chatMessage': 'chat_messages',
  'expense': 'expenses',
  'invoice': 'invoices',
  'invoiceItem': 'invoice_items',
  'organizationSettings': 'organization_settings',
  'tenantMembership': 'tenant_memberships',
  'permissionTemplate': 'permission_templates',
  'bulkOperation': 'bulk_operations',
  'bulkOperationResult': 'bulk_operation_results',
  'bulkOperationHistory': 'bulk_operation_history',
  'organizationLocalizationSettings': 'org_localization_settings',
  'crowdinIntegration': 'crowdin_integrations',
  'verificationToken': 'verificationtokens',
  'settingChangeDiff': 'setting_change_diffs',
  'auditEvent': 'audit_events',
  'translationKey': 'translation_keys',
  'translationMetrics': 'translation_metrics',
  'userProfile': 'user_profiles',
  'regionalFormat': 'regional_formats',
  'menuCustomization': 'menu_customizations',
  'favoriteSetting': 'favorite_settings',
  'permissionAudit': 'permission_audits',
  'taskTemplate': 'task_templates',
  'requestTask': 'request_tasks',
  'bookingSettings': 'booking_settings',
  'bookingStepConfig': 'booking_step_config',
  'businessHoursConfig': 'business_hours_config',
  'paymentMethodConfig': 'payment_method_config',
  'notificationTemplate': 'notification_templates',
  'serviceRequestComment': 'service_request_comments',
  'notificationSettings': 'notification_settings',
  'sidebarPreferences': 'sidebar_preferences',
  'translationPriority': 'translation_priorities',
  'integrationSettings': 'integration_settings',
  'workflowTemplate': 'workflow_templates',
  'userWorkflow': 'user_workflows',
  'workflowStep': 'workflow_steps',
  'workflowHistory': 'workflow_history',
  'workflowNotification': 'workflow_notifications',
  'userPermission': 'user_permissions',
  'cronTelemetrySettings': 'cron_telemetry_settings',
};

const files = glob.sync('src/**/*.ts', { nodir: true })
  .concat(glob.sync('src/**/*.tsx', { nodir: true }))
  .concat(glob.sync('netlify/functions/**/*.ts', { nodir: true }));

let totalReplacements = 0;
const results = [];

for (const file of files) {
  let text = fs.readFileSync(file, 'utf8');
  let fileReplacements = 0;
  
  for (const [singular, plural] of Object.entries(map)) {
    // Replace prisma.SINGULAR with prisma.PLURAL
    const rePrisma = new RegExp('\\bprisma\\.' + singular + '\\b', 'g');
    const matchesPrisma = (text.match(rePrisma) || []).length;
    if (matchesPrisma > 0) {
      text = text.replace(rePrisma, 'prisma.' + plural);
      fileReplacements += matchesPrisma;
    }
    
    // Replace tx.SINGULAR with tx.PLURAL (for transaction contexts)
    const reTx = new RegExp('\\btx\\.' + singular + '\\b', 'g');
    const matchesTx = (text.match(reTx) || []).length;
    if (matchesTx > 0) {
      text = text.replace(reTx, 'tx.' + plural);
      fileReplacements += matchesTx;
    }
  }
  
  if (fileReplacements > 0) {
    fs.writeFileSync(file, text, 'utf8');
    results.push({ file, replacements: fileReplacements });
    totalReplacements += fileReplacements;
  }
}

console.log(`Files changed: ${results.length}`);
console.log(`Total replacements: ${totalReplacements}`);
console.log('\nDetailed results:');
for (const r of results) {
  console.log(`  ${r.file}: ${r.replacements} replacements`);
}
