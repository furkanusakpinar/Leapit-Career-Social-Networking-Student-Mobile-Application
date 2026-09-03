export function hashPassword(ascii) {
  if (typeof ascii !== 'string') {
    ascii = String(ascii);
  }

  function rightRotate(value, amount) {
    return (value >>> amount) | (value << (32 - amount));
  }

  var mathPow = Math.pow;
  var maxWord = mathPow(2, 32);
  var lengthProperty = 'length';
  var i, j;
  var result = '';

  var words = [];
  var asciiLength = ascii[lengthProperty] * 8;
  
  var hash = [];
  var k = [];
  var primeCounter = 0;

  var isPrime = {};
  for (var candidate = 2; primeCounter < 64; candidate++) {
    if (!isPrime[candidate]) {
      for (i = 0; i < 1000; i += candidate) {
        isPrime[i] = 1;
      }
      hash[primeCounter] = (mathPow(candidate, .5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
      isPrime[candidate] = true;
    }
  }
  
  ascii += '\x80';
  while (ascii[lengthProperty] % 64 - 56) ascii += '\x00';
  for (i = 0; i < ascii[lengthProperty]; i++) {
    j = ascii.charCodeAt(i);
    if (j >> 8) return '';
    words[i >> 2] |= j << ((3 - i % 4) * 8);
  }
  words[words[lengthProperty]] = ((asciiLength / maxWord) | 0);
  words[words[lengthProperty]] = (asciiLength | 0);
  
  var w = [];
  var h0 = hash[0], h1 = hash[1], h2 = hash[2], h3 = hash[3], h4 = hash[4], h5 = hash[5], h6 = hash[6], h7 = hash[7];

  for (i = 0; i < words[lengthProperty]; i += 16) {
    for (j = 0; j < 64; j++) {
      if (j < 16) {
        w[j] = words[i + j];
      } else {
        var s0 = rightRotate(w[j - 15], 7) ^ rightRotate(w[j - 15], 18) ^ (w[j - 15] >>> 3);
        var s1 = rightRotate(w[j - 2], 17) ^ rightRotate(w[j - 2], 19) ^ (w[j - 2] >>> 10);
        w[j] = (w[j - 16] + s0 + w[j - 7] + s1) | 0;
      }
      
      var a = hash[0], b = hash[1], c = hash[2], d = hash[3], e = hash[4], f = hash[5], g = hash[6], h = hash[7];
      var temp1 = (h + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) + ((e & f) ^ (~e & g)) + k[j] + (w[j] || 0)) | 0;
      var temp2 = ((rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
      
      hash[7] = hash[6];
      hash[6] = hash[5];
      hash[5] = hash[4];
      hash[4] = (hash[3] + temp1) | 0;
      hash[3] = hash[2];
      hash[2] = hash[1];
      hash[1] = hash[0];
      hash[0] = (temp1 + temp2) | 0;
    }
    
    hash[0] = (hash[0] + h0) | 0;
    hash[1] = (hash[1] + h1) | 0;
    hash[2] = (hash[2] + h2) | 0;
    hash[3] = (hash[3] + h3) | 0;
    hash[4] = (hash[4] + h4) | 0;
    hash[5] = (hash[5] + h5) | 0;
    hash[6] = (hash[6] + h6) | 0;
    hash[7] = (hash[7] + h7) | 0;
    
    h0 = hash[0]; h1 = hash[1]; h2 = hash[2]; h3 = hash[3]; h4 = hash[4]; h5 = hash[5]; h6 = hash[6]; h7 = hash[7];
  }
  
  for (i = 0; i < 8; i++) {
    var val = hash[i];
    if (val < 0) val += 0x100000000;
    var str = val.toString(16);
    while (str[lengthProperty] < 8) str = '0' + str;
    result += str;
  }
  return result;
}
