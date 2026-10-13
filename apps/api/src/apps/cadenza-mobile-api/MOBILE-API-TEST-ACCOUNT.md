# Mobile API Development Test Account

This is a development-only account created by the existing Cadenza development seed.

## Student / Client Account

```text
Email:    client@example.com
Password: 112233445566
Type:     CLIENT
```

The account is intended to test:

```http
POST /api/v1/cadenza-mobile/auth/login
GET  /api/v1/cadenza-mobile/auth/me
GET  /api/v1/cadenza-mobile/enrollments/available-packages
GET  /api/v1/cadenza-mobile/enrollments/mine
GET  /api/v1/cadenza-mobile/room-bookings/mine
GET  /api/v1/cadenza-mobile/instrument-rentals/mine
```

## Seed Command

The account is created or refreshed by the development seed:

```powershell
$env:DOTENV_CONFIG_PATH = "C:\path\to\cadenza-devv\.env"
npm --workspace @cadenza-app/api run db:seed:all:development
Remove-Item Env:DOTENV_CONFIG_PATH
```

The seed reads the password from `SEED_CADENZA_PASSWORD` when it is set. Otherwise, the repository development seed uses the password shown above.

## Important Security Rule

These credentials are for local development only. Do not use them in production, do not reuse the password, and do not add production credentials to Markdown, source code, or committed environment files.

## Mobile API URL

The backend must be running on port `3000` with the mobile router mounted at:

```text
http://localhost:3000/api/v1/cadenza-mobile
```

For a physical device, replace `localhost` with the development computer's LAN IP address.
