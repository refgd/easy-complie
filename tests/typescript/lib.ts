export class TestClass{
    private _testCall() {
        return new Promise(resolve => {
            setTimeout(() => {
                resolve('test async');
            }, 2000);
        })
    }

    async _testAwait() {
        let r = await this._testCall()
        console.log(r);
    }
}