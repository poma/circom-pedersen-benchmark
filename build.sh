#!/usr/bin/env bash

echo "Browserifying script"
browserify main.js -o index.js

echo "Generating circuit"
circom circuit.circom -o circuit.json