//outfile: ../output/ts/test.js, compress: true, target: es6, lib: es2018, lib: dom
function testfun(){
    return 'asd';
}
var a = testfun();
console.log(a);

class TestClass{
    testCall() {
        return new Promise(resolve => {
            setTimeout(() => {
                resolve('test async');
            }, 2000);
        })
    }

    async testAwait() {
        let r = await this.testCall()
        console.log(r);
    }
}

var t = new TestClass();
t.testAwait();