const circom = require("circom");
const snarkjs = require("snarkjs");
const groth = snarkjs["groth"];
const crypto = require("crypto");
const pedersen = require("./node_modules/circomlib/src/pedersenHash.js");
const babyjub = require("./node_modules/circomlib/src/babyjub.js");

const rbigint = (nbytes) => snarkjs.bigInt.leBuff2int(crypto.randomBytes(nbytes));

function hashData(data) {
  const b = snarkjs.bigInt(data).leInt2Buff(32);
  const h = pedersen.hash(b);
  const hP = babyjub.unpackPoint(h);
  return hP[0];
}

async function main() {
  const preimage = rbigint(30);
  let hash = preimage;
  for (let i = 0; i < 5; i++) {
    hash = hashData(hash);
  }

  console.log("Generating circuit...");
  console.time("Generate");
  let circuitDef;
  if (typeof window !== 'undefined') {
    // browser can't use circom compiler and needs to load precompiled version
    // Don't forget to run build.sh to generate it
    circuitDef = await fetch("circuit.json");
    circuitDef = await circuitDef.json();
  } else {
    circuitDef = await circom("circuit.circom");
  }
  const circuit = new snarkjs.Circuit(circuitDef);
  const setup = groth.setup(circuit);
  const pk = setup.vk_proof;
  const vk = setup.vk_verifier;
  console.timeEnd("Generate");
  console.log("Coinstraint count:", circuit.nConstraints);

  console.log("Generating proof");
  //console.time("Proof");
  const start = new Date();
  const witness = circuit.calculateWitness({preimage, hash});
  const {proof, publicSignals} = groth.genProof(pk, witness);
  const elapsed = (new Date()).getTime() - start.getTime();
  if (typeof window !== 'undefined') {
    // Alert is easier to read on mobile than dev console
    alert("Proof time: " + elapsed + "ms");
  } else {
    console.log("Proof time: " + elapsed + "ms");
  }
  //console.timeEnd("Proof");

  console.time("Verify");
  const valid = groth.isValid(vk, proof, publicSignals);
  console.timeEnd("Verify");

  console.log("Valid:", valid);
}

main().then(() => console.log("Done")).catch(err => console.log(err));