-- Добавление первого сервера USA на основе VLESS ссылки
-- vless://55056763-684b-44d7-aefc-8f7a604a105c@62.60.178.134:39162?type=tcp&security=reality&pbk=c8_0XE6Hmvh8VhfqqcFsCYWgQhR-WivrXZuepmnRLBI&fp=chrome&pqv=&sni=google.com&sid=78d6bdadd698f0&spx=%2F&flow=xtls-rprx-vision#nins

INSERT INTO servers (
  server_name,
  server_ip,
  country,
  status,
  vless_type,
  vless_security,
  vless_fp,
  vless_sni,
  vless_sid,
  vless_spx,
  vless_flow,
  server_port,
  xui_api_url,
  xui_username,
  xui_password,
  vless_domain,
  vless_port,
  vless_path,
  inbound_id,
  vless_public_key,
  active_subscribers,
  server_role
) VALUES (
  'USA-01',                                           -- server_name
  '62.60.178.134',                                   -- server_ip
  'USA',                                             -- country
  true,                                              -- status (активен)
  'tcp',                                             -- vless_type
  'reality',                                         -- vless_security
  'chrome',                                          -- vless_fp
  'google.com',                                      -- vless_sni
  '78d6bdadd698f0',                                  -- vless_sid
  '/',                                               -- vless_spx
  'xtls-rprx-vision',                               -- vless_flow
  39162,                                             -- server_port
  'https://62.60.178.134:2053',                     -- xui_api_url (стандартный порт 3x-ui)
  'admin',                                           -- xui_username (замените на реальный)
  'YOUR_PANEL_PASSWORD',                             -- xui_password (ЗАМЕНИТЕ НА РЕАЛЬНЫЙ!)
  '62.60.178.134',                                   -- vless_domain (IP как домен)
  39162,                                             -- vless_port
  '/',                                               -- vless_path
  '1',                                               -- inbound_id (замените на реальный ID из панели)
  'c8_0XE6Hmvh8VhfqqcFsCYWgQhR-WivrXZuepmnRLBI',     -- vless_public_key
  0,                                                 -- active_subscribers
  'primary'                                          -- server_role
);