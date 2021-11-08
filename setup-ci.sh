#!/bin/bash
# adds dummy secrets files so typescript will run for ci
printf '{"token": "aba", "environment": "npr"}' > secrets.json
printf '{"type": "service_account", "project_id": "id", "private_key_id": "a", "private_key": "b", "client_email": "a", "client_id": "1", "auth_uri": "auth", "token_uri": "token", "auth_provider_x509_cert_url": "a", "client_x509_cert_url": "a"}' > serviceAccountKey.json