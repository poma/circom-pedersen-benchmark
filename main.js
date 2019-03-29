const circom = require("circom");
const snarkjs = require("snarkjs");
const bigInt = require("snarkjs").bigInt;
const groth = snarkjs["groth"];
const fs = require("fs");
const crypto = require("crypto");
const pedersen = require("./node_modules/circomlib/src/pedersenHash.js");
const babyjub = require("./node_modules/circomlib/src/babyjub.js");

const fload = (fname) => unstringifyBigInts(JSON.parse(fs.readFileSync(fname, "utf8")));
const fdump = (fname, data) => fs.writeFileSync(fname, JSON.stringify(stringifyBigInts(data)), "utf8");
const rbigint = (nbytes) => snarkjs.bigInt.leBuff2int(crypto.randomBytes(nbytes));

function stringifyBigInts(o) {
  if ((typeof(o) == "bigint") || (o instanceof bigInt))  {
    return o.toString(10);
  } else if (Array.isArray(o)) {
    return o.map(stringifyBigInts);
  } else if (typeof o == "object") {
    const res = {};
    for (let k in o) {
      res[k] = stringifyBigInts(o[k]);
    }
    return res;
  } else {
    return o;
  }
}

function unstringifyBigInts(o) {
  if ((typeof(o) == "string") && (/^[0-9]+$/.test(o) ))  {
    return bigInt(o);
  } else if (Array.isArray(o)) {
    return o.map(unstringifyBigInts);
  } else if (typeof o == "object") {
    const res = {};
    for (let k in o) {
      res[k] = unstringifyBigInts(o[k]);
    }
    return res;
  } else {
    return o;
  }
}

function hashData(data) {
  const b = snarkjs.bigInt(data).leInt2Buff(32);
  const h = pedersen.hash(b);
  const hP = babyjub.unpackPoint(h);
  return hP[0];
}

async function load() {
  console.log("Loading snarks...");
  console.time("Load");
  let circuit, pk, vk;
  if (fs.existsSync("compiled/circuit.json")) {
    circuit = new snarkjs.Circuit(fload(`compiled/circuit.json`));
    pk = fload(`compiled/circuit_proving_key.json`);
    vk = fload(`compiled/circuit_verification_key.json`);
  } else {
    const circuitDef = await circom("circuit.circom");
    circuit = new snarkjs.Circuit(circuitDef);
    const setup = groth.setup(circuit);
    pk = setup.vk_proof;
    vk = setup.vk_verifier;

    fs.mkdirSync("compiled");
    fdump("compiled/circuit.json", circuitDef);
    fdump("compiled/circuit_proving_key.json", pk);
    fdump("compiled/circuit_verification_key.json", vk);
  }
  console.timeEnd("Load");
  return { circuit, pk, vk }
}

async function main() {
  const preimage = rbigint(30);
  let hash = preimage;
  for (var i = 0; i < 5; i++) {
    hash = hashData(hash);
  }

  const { circuit, pk, vk } = await load();
  console.log("Coinstraint count:", circuit.nConstraints);

  console.log("Generating proof");
  console.time("Proof");
  const witness = circuit.calculateWitness({preimage, hash});
  const {proof, publicSignals} = groth.genProof(pk, witness);
  console.timeEnd("Proof");

  console.time("Verify");
  const valid = groth.isValid(vk, proof, publicSignals);
  console.timeEnd("Verify");

  console.log("Valid:", valid);
}

main();