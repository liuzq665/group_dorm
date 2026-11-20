-- Compatibility view for the repair configuration query retained by older deployments.
CREATE OR REPLACE VIEW sys_user AS
SELECT repairer_user_id AS user_id, login_account, enabled, 'REPAIRER' AS role_code
FROM repairer_profile;
