include "./node_modules/circomlib/circuits/pedersen.circom";
include "./node_modules/circomlib/circuits/bitify.circom";

template Hasher() {
  signal input hash;
  signal private input preimage;

  component hasher = Pedersen(256);
  component bits = Num2Bits(256);
  bits.in <== preimage;
  for (var i = 0; i<256; i++) {
    hasher.in[i] <== bits.out[i];
  }

  hash === hasher.out[0];
}

component main = Hasher();