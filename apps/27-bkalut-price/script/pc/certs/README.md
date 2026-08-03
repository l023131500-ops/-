# TLS intermediate certificates for price-comparison feeds

## Why this exists

The Cerberus transparency portal at `https://url.publishedprices.co.il`
(Rami Levy, Osher Ad, Yochananof, Hazi Hinam, Tiv Taam, Carrefour, ...) serves
its TLS handshake with **only the leaf certificate** and omits the intermediate
CA. Node.js therefore cannot build the trust chain and global `fetch` fails with
`UNABLE_TO_VERIFY_LEAF_SIGNATURE` ("fetch failed"), even though the server and
certificate are perfectly valid.

The leaf is `CN=*.publishedprices.co.il`, issued by
`Sectigo Public Server Authentication CA DV R36`, which is itself issued by
`Sectigo Public Server Authentication Root R46` (already trusted by Node).
Supplying the missing R36 intermediate completes the chain.

> Note: the host **must** be `url.publishedprices.co.il` (single label under the
> wildcard). The `url.retail.publishedprices.co.il` alias resolves to the same
> server but is rejected with `ERR_TLS_CERT_ALTNAME_INVALID` because a one-level
> wildcard cert does not match a two-label subdomain.

## How it is loaded

The daily importer points `NODE_EXTRA_CA_CERTS` at
`sectigo-server-auth-dv-r36.pem` (see `.github/workflows/pc-daily-import.yml` and
`package.json` `pc:import` script). This adds the intermediate to Node's trust
store at launch with zero changes to the fetch code and without disabling TLS
verification.

## Refreshing the certificate

If the intermediate is rotated, re-download it:

```
curl -sS http://crt.sectigo.com/SectigoPublicServerAuthenticationCADVR36.crt -o /tmp/i.crt
openssl x509 -inform DER -in /tmp/i.crt -out script/pc/certs/sectigo-server-auth-dv-r36.pem
```
