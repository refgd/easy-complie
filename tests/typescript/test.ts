//outfile: ../output/ts/test.js, useSWC: true, compress: true
///<amd-module name="app"/>

import { TestClass } from "./lib";
function testfun(){
    return 'asd';
}
var a = testfun();
console.log(a);

class TestClass2 extends TestClass{
    name:string = 'TestClass2'
}

var t = new TestClass2();
t._testAwait();

export default t;