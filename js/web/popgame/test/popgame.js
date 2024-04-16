describe(tt.getModuleSuiteName(), function() {
	describe('tracking initialization', function() {
		// reported in https://discord.com/channels/577475401144598539/950390739437760523/1184507486787612742
		//   and https://discord.com/channels/577475401144598539/950390739437760523/1184517848706596988
		afterAll(function() {
			localStorage.removeItem('popgameTracking');
		});

		it('if no stored value', function() {
			localStorage.removeItem('popgameTracking');
			Popgame.trackingInit();

			expect(Popgame.tracking).toBeTruthy();
			expect(Popgame.tracking.start).toBeTruthy();
			expect(Popgame.tracking.start.total).toBe(0);
			expect(Popgame.tracking.start.grandPrize).toBe(0);
			expect(Popgame.tracking.afterPop).toBeTruthy();
			expect(Popgame.tracking.afterPop.total).toBe(0);
			expect(Popgame.tracking.afterPop.grandPrize).toBe(0);
			expect(Popgame.tracking.leftOnBoard).toBeTruthy();
			expect(Popgame.tracking.leftOnBoard.grandPrize).toBe(0);
		});

		it('if stored value is invalid', function() {
			localStorage.setItem('popgameTracking','foobar');
			Popgame.trackingInit();

			expect(Popgame.tracking).toBeTruthy();
			expect(Popgame.tracking.start).toBeTruthy();
			expect(Popgame.tracking.start.total).toBe(0);
			expect(Popgame.tracking.start.grandPrize).toBe(0);
			expect(Popgame.tracking.afterPop).toBeTruthy();
			expect(Popgame.tracking.afterPop.total).toBe(0);
			expect(Popgame.tracking.afterPop.grandPrize).toBe(0);
			expect(Popgame.tracking.leftOnBoard).toBeTruthy();
			expect(Popgame.tracking.leftOnBoard.grandPrize).toBe(0);
		});

		it('if stored value is v1', function() {
			localStorage.setItem('popgameTracking','{"start":{"total":3,"grandPrize":5 }, "afterPop":{"total":7,"grandPrize":11} }');
			Popgame.trackingInit();

			expect(Popgame.tracking).toBeTruthy();
			expect(Popgame.tracking.start).toBeTruthy();
			expect(Popgame.tracking.start.total).toBe(0);
			expect(Popgame.tracking.start.grandPrize).toBe(0);
			expect(Popgame.tracking.afterPop).toBeTruthy();
			expect(Popgame.tracking.afterPop.total).toBe(0);
			expect(Popgame.tracking.afterPop.grandPrize).toBe(0);
			expect(Popgame.tracking.leftOnBoard).toBeTruthy();
			expect(Popgame.tracking.leftOnBoard.grandPrize).toBe(0);
		});

		it('if stored value is v2', function() {
			localStorage.setItem('popgameTracking','{"start":{"total":3,"grandPrize":5}, "afterPop":{"total":7,"grandPrize":11}, "leftOnBoard":{"grandPrize":13} }');
			Popgame.trackingInit();

			expect(Popgame.tracking).toBeTruthy();
			expect(Popgame.tracking.start).toBeTruthy();
			expect(Popgame.tracking.start.total).toBe(3);
			expect(Popgame.tracking.start.grandPrize).toBe(5);
			expect(Popgame.tracking.afterPop).toBeTruthy();
			expect(Popgame.tracking.afterPop.total).toBe(7);
			expect(Popgame.tracking.afterPop.grandPrize).toBe(11);
			expect(Popgame.tracking.leftOnBoard).toBeTruthy();
			expect(Popgame.tracking.leftOnBoard.grandPrize).toBe(13);
		});
	});
});
