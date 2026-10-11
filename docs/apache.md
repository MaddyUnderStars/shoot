# Apache configuration

To use Apache httpd as frontend proxy for Shoot, a configuration is
necessary that preserves the `Host` header from the public hostname
since otherwise the signatures will break that include the host
string. The server uses an Express config to get that correct, which
is set in config called `trust_proxy`. If that doesn't work or the
proxy config is not using specific addresses, it is also possible to
set a value in the Apache config to make it keep the `Host` header
from the incoming request, e.g. if your server is running on the URL
shoot.example.com but is forwarding to localhost.

A simple proxy config in httpd.conf looks like this:

```
<VirtualHost ***>
  ServerName shoot.example.com
  ProxyPreserveHost on
  ProxyPass    /   ws://localhost:3001/
</VirtualHost>
```
