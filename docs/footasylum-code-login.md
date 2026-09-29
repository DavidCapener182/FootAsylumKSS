# Footasylum code login setup

The app accepts numeric Supabase Auth `invite` and `recovery` codes at `/login/code`. The password login and existing reset-link route remain available during transition.

## Manual KSS delivery

The KSS **Admin → Prepare login email** form uses the Supabase admin `generateLink` API to produce a one-use code without sending email. For a new address it creates an inactive invitation profile; a KSS administrator must approve the intended role and store access separately. For an existing active account it creates a recovery code without changing the account's access. The code and suggested email text appear only in the administrator's browser until they leave the page. Copy the text into Outlook, verify the recipient, and send it yourself. Generate a fresh code if the first expires. Never log or store the raw code in the application database.

This manual process does not require SMTP configuration. The optional automated delivery setup below is for a future change.

To activate code emails in the Footasylum Supabase project:

Outlook identifies David's KSS mailbox as an Exchange/Office 365 account connected to `https://outlook.office365.com` over HTTPS port 443. That is the Outlook/Exchange connection, not SMTP. Outlook does not expose an SMTP credential or show whether SMTP AUTH is enabled for the mailbox. KSS IT must supply an approved sending method and its connection details; do not reuse the Outlook sign-in password as an assumed SMTP password.

1. Configure custom SMTP with a KSS-approved sender. Use the approved SMTP credentials in the Supabase Auth dashboard, never in the app repository. Set the sender address to the authorised KSS mailbox and verify delivery before inviting clients.
2. Replace the Auth **Invite user** template with `supabase/email-templates/footasylum-invite.html` and the **Reset password** template with `supabase/email-templates/footasylum-recovery.html`. Both use `{{ .Token }}` and link only to the Footasylum site.
3. Set the Auth Site URL to `https://footasylum.kssnwltd.co.uk` and retain the existing `/login/reset-password` redirect while outstanding old link emails may still be valid.
4. Test with a dedicated non-client account: receive an invite code, redeem it once, set a password, sign in, request recovery, redeem the recovery code, and confirm old codes cannot be reused. Check the resulting account has only its assigned profile and store access.

Do not send an invitation or reset email as part of deploying the app code. Configure and verify mail delivery separately.
