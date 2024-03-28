describe('test tools', function() {
	it('getFilename', function() {
		expect(tt.getFilename()).toBe(extUrl + 'test/testtoolsspecs.js');
	});

	it('getModuleSuiteName', function() {
		expect(tt.getModuleSuiteName()).toBe('testtoolsspecs');
	});
});
