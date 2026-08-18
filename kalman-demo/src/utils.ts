export function getGaussianNoise(mean = 0, stdev = 1) {
    let u1 = 1 - Math.random();
    let u2 = Math.random();
    let randStdNormal = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return mean + stdev * randStdNormal;
}
