# Cloudflare Tunnel Setup Guide for House Checklist

This guide walks through setting up a secure Cloudflare Tunnel with email-based authentication to protect your house checklist application running on port 8004.

## Prerequisites

- A Cloudflare account (free tier is sufficient)
- A domain name managed through Cloudflare's DNS
- Linux system with the application running on localhost:8004

## Step 1: Install cloudflared

### Option A: System-wide installation (requires sudo)
```bash
# Download the latest cloudflared debian package
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb

# Install with dpkg
sudo dpkg -i cloudflared.deb

# Verify installation
cloudflared version
```

### Option B: User installation (no sudo required)
```bash
# Create user bin directory
mkdir -p ~/bin

# Download and extract cloudflared
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
dpkg-deb -x cloudflared.deb /tmp/cloudflared-extract
cp /tmp/cloudflared-extract/usr/bin/cloudflared ~/bin/

# Make executable
chmod +x ~/bin/cloudflared

# Test installation
~/bin/cloudflared version
```

## Step 2: Prepare Your Domain

### Move Domain to Cloudflare DNS

1. **Add site to Cloudflare:**
   - Log into [Cloudflare Dashboard](https://dash.cloudflare.com)
   - Click "Add a Site"
   - Enter your domain (e.g., `frosthill.info`)
   - Select the Free plan
   - Note the two nameservers provided (e.g., `nina.ns.cloudflare.com`, `bob.ns.cloudflare.com`)

2. **Update nameservers at your registrar:**
   - Log into your domain registrar (Namecheap, GoDaddy, etc.)
   - Navigate to DNS settings for your domain
   - Change nameservers to "Custom DNS"
   - Replace with Cloudflare's nameservers
   - Save changes

3. **Wait for DNS propagation:**
   - Usually takes 15-30 minutes
   - Can take up to 24 hours
   - Check status in Cloudflare Dashboard (will show "Active" when ready)

## Step 3: Authenticate cloudflared

```bash
# Authenticate with your Cloudflare account
~/bin/cloudflared tunnel login

# This will open a browser window
# Select your domain from the list to authorize
# The certificate will be saved to ~/.cloudflared/cert.pem
```

## Step 4: Create a Named Tunnel

```bash
# Create a new tunnel (replace 'house-checklist' with your preferred name)
~/bin/cloudflared tunnel create house-checklist

# This creates:
# - Tunnel UUID
# - Credentials file: ~/.cloudflared/<TUNNEL_ID>.json
# - Registers tunnel with Cloudflare
```

Note the Tunnel ID that's displayed - you'll need it for configuration.

## Step 5: Configure the Tunnel

Create a configuration file at `~/.cloudflared/config.yml`:

```yaml
tunnel: <YOUR_TUNNEL_ID>
credentials-file: /home/<username>/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: house.frosthill.info
    service: http://localhost:8004
    originRequest:
      noTLSVerify: true
  - service: http_status:404
```

Replace:
- `<YOUR_TUNNEL_ID>` with your actual tunnel ID
- `<username>` with your system username
- `house.frosthill.info` with your desired subdomain

## Step 6: Create DNS Route

```bash
# Route traffic from your domain to the tunnel
~/bin/cloudflared tunnel route dns house-checklist house.frosthill.info

# This creates a CNAME record pointing to your tunnel
```

## Step 7: Configure Cloudflare Access (Authentication)

### Via Dashboard:

1. **Navigate to Zero Trust:**
   - Go to [Cloudflare Zero Trust Dashboard](https://one.dash.cloudflare.com)
   - Select your account

2. **Create Access Application:**
   - Go to Access → Applications
   - Click "Add an application"
   - Select "Self-hosted"
   
3. **Configure Application:**
   - **Name:** House Checklist
   - **Session Duration:** 24 hours (or your preference)
   - **Application domain:** `house.frosthill.info`
   - **Path:** Leave blank to protect entire subdomain

4. **Set Access Policy:**
   - **Policy name:** Authorized Users
   - **Action:** Allow
   - **Configure rules:** 
     - Select "Emails"
     - Add authorized email addresses (one per line)
   - Click "Add policy"

5. **Save Application**

### Via Command Line (Alternative):

```bash
# List existing access applications
~/bin/cloudflared access application list

# Create new access application (example)
# Note: Full Access configuration is easier via dashboard
```

## Step 8: Start the Tunnel

### Run interactively (for testing):
```bash
~/bin/cloudflared tunnel run house-checklist
```

### Run as a service (recommended for production):

Create systemd service file at `/etc/systemd/system/cloudflared-house.service`:

```ini
[Unit]
Description=Cloudflare Tunnel for House Checklist
After=network.target

[Service]
Type=simple
User=<username>
ExecStart=/home/<username>/bin/cloudflared tunnel run house-checklist
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start the service:
```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable service to start on boot
sudo systemctl enable cloudflared-house

# Start the service
sudo systemctl start cloudflared-house

# Check status
sudo systemctl status cloudflared-house
```

## Step 9: Test Your Setup

1. **Access your application:**
   - Navigate to `https://house.frosthill.info`
   - You should be redirected to Cloudflare Access login

2. **Authenticate:**
   - Enter your authorized email address
   - Check email for verification code
   - Enter code to authenticate

3. **Verify access:**
   - After authentication, you should see your house checklist
   - Session will persist based on configured duration

## Troubleshooting

### Common Issues:

1. **"No cert.pem found" error:**
   ```bash
   # Re-run authentication
   ~/bin/cloudflared tunnel login
   ```

2. **Domain not active in Cloudflare:**
   - Wait for DNS propagation
   - Verify nameservers are correctly set at registrar

3. **Tunnel not connecting:**
   ```bash
   # Check tunnel status
   ~/bin/cloudflared tunnel list
   
   # View tunnel info
   ~/bin/cloudflared tunnel info house-checklist
   
   # Check logs
   journalctl -u cloudflared-house -f
   ```

4. **Access authentication not working:**
   - Verify email addresses are correctly added in Access policy
   - Check that application domain matches your tunnel configuration
   - Ensure cookies are enabled in browser

## Quick Start (Temporary Tunnel)

For testing without a domain or while waiting for DNS:

```bash
# Create a quick tunnel (no authentication)
~/bin/cloudflared tunnel --url http://localhost:8004

# This provides a temporary URL like:
# https://random-words.trycloudflare.com
```

**Note:** Quick tunnels are temporary and don't support authentication.

## Security Best Practices

1. **Limit email access:** Only add specific, trusted email addresses
2. **Set appropriate session duration:** Balance security with convenience
3. **Monitor access logs:** Regular check Access logs in Cloudflare dashboard
4. **Keep cloudflared updated:** Regular update to latest version
5. **Use strong email account security:** Enable 2FA on authorized email accounts

## Useful Commands

```bash
# List all tunnels
~/bin/cloudflared tunnel list

# Delete a tunnel
~/bin/cloudflared tunnel delete house-checklist

# View tunnel configuration
~/bin/cloudflared tunnel info house-checklist

# Test tunnel connectivity
~/bin/cloudflared tunnel run --dry-run house-checklist

# View service logs
journalctl -u cloudflared-house -f

# Restart service
sudo systemctl restart cloudflared-house
```

## Additional Resources

- [Cloudflare Tunnel Documentation](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps)
- [Cloudflare Access Documentation](https://developers.cloudflare.com/cloudflare-one/policies/access)
- [Zero Trust Dashboard](https://one.dash.cloudflare.com)