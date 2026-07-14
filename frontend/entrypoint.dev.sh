#!/bin/sh
set -e

# Garante deps atualizadas no volume nomeado (dev)
npm install

exec "$@"
