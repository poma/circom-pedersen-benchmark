include "./node_modules/circomlib/circuits/pedersen.circom";
include "./node_modules/circomlib/circuits/bitify.circom";

// 5 rounds of 256bit pedersen hash
template Hasher() {
	signal input hash;
	signal private input preimage;

	var result = preimage;
	component hasher[5];
	component bits[5];
	for(var r = 0; r < 5; r++) {
		hasher[r] = Pedersen(256);
		bits[r] = Num2Bits(256);
		bits[r].in <== result;
		for (var i = 0; i<256; i++) {
			hasher[r].in[i] <== bits[r].out[i];
		}
		result = hasher[r].out[0];
	}

	hash === result;
}

component main = Hasher();