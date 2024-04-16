describe(tt.getModuleSuiteName(), function() {
	describe('- test board', function() {
		beforeEach(function() {
			mergerGame.types = ['top', 'bottom', 'full'];
		});

		describe('(base)', function() {
			// hand-crafted cases to test specific behaviours
			it('empty', function() {
				const locked = {"none":[0,0,0,0], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const free = {"none":[0,0,0,0], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(0);
				expect(result.progress).toBe(0);
			});

			it('one L1 bottom', function() {
				const locked = {"none":[0,0,0,0], "bottom":[1,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const free = {"none":[0,0,0,0], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(0);
				expect(result.progress).toBe(0);
			});

			it('one L1 top', function() {
				const locked = {"none":[0,0,0,0], "bottom":[0,0,0,0], "top":[1,0,0,0], "full":[0,0,0,0]};
				const free = {"none":[0,0,0,0], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(0);
				expect(result.progress).toBe(0);
			});

			it('one L1 free', function() {
				const locked = {"none":[0,0,0,0], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const free = {"none":[1,0,0,0], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(0);
				expect(result.progress).toBe(0);
			});

			it('one L1 bot merge', function() {
				const locked = {"none":[0,0,0,0], "bottom":[1,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const free = {"none":[1,0,0,0], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(0);
				expect(result.progress).toBe(1);
			});

			it('one L1 top merge', function() {
				const locked = {"none":[0,0,0,0], "bottom":[0,0,0,0], "top":[1,0,0,0], "full":[0,0,0,0]};
				const free = {"none":[1,0,0,0], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(0);
				expect(result.progress).toBe(1);
			});

			it('two L1 free', function() {
				const locked = {"none":[0,0,0,0], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const free = {"none":[2,0,0,0], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(0);
				expect(result.progress).toBe(0);
			});


			it('one L1 bot L2 top merge', function() {
				const locked = {"none":[0,0,0,0], "bottom":[1,0,0,0], "top":[0,1,0,0], "full":[0,0,0,0]};
				const free = {"none":[1,0,0,0], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(1);
				expect(result.progress).toBe(2);
			});

			it('one L1 top L2 bot merge', function() {
				const locked = {"none":[0,0,0,0], "bottom":[0,1,0,0], "top":[1,0,0,0], "full":[0,0,0,0]};
				const free = {"none":[1,0,0,0], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(1);
				expect(result.progress).toBe(2);
			});

			it('one L2 bot L3 top merge', function() {
				const locked = {"none":[0,0,0,0], "bottom":[0,1,0,0], "top":[0,0,1,0], "full":[0,0,0,0]};
				const free = {"none":[0,1,0,0], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(3);
				expect(result.progress).toBe(2);
			});

			it('one L2 top L3 bot merge', function() {
				const locked = {"none":[0,0,0,0], "bottom":[0,0,1,0], "top":[0,1,0,0], "full":[0,0,0,0]};
				const free = {"none":[0,1,0,0], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(3);
				expect(result.progress).toBe(2);
			});

			it('one L3 bot L4 top merge', function() {
				const locked = {"none":[0,0,0,0], "bottom":[0,0,1,0], "top":[0,0,0,1], "full":[0,0,0,0]};
				const free = {"none":[0,0,1,0], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(3);
				expect(result.progress).toBe(3);
			});

			it('one L3 top L4 bot merge', function() {
				const locked = {"none":[0,0,0,0], "bottom":[0,0,0,1], "top":[0,0,1,0], "full":[0,0,0,0]};
				const free = {"none":[0,0,1,0], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(3);
				expect(result.progress).toBe(3);
			});

			it('one L4 top L4 bot merge', function() {
				const locked = {"none":[0,0,0,0], "bottom":[0,0,0,1], "top":[0,0,0,1], "full":[0,0,0,0]};
				const free = {"none":[0,0,0,1], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(3);
				expect(result.progress).toBe(4);
			});

			it('two L1 bot L2 top merges into L4', function() {
				const locked = {"none":[0,0,0,0], "bottom":[2,0,0,0], "top":[0,2,0,0], "full":[0,0,0,0]};
				const free = {"none":[2,0,0,0], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(3);
				expect(result.progress).toBe(4);
			});

			it('two L1 top L2 bot merges into L4', function() {
				const locked = {"none":[0,0,0,0], "bottom":[0,2,0,0], "top":[2,0,0,0], "full":[0,0,0,0]};
				const free = {"none":[2,0,0,0], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(3);
				expect(result.progress).toBe(4);
			});


			it('one L1 bot ignores free L2', function() {
				const locked = {"none":[0,0,0,0], "bottom":[1,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const free = {"none":[1,1,0,0], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(0);
				expect(result.progress).toBe(1);
			});

			it('one L1 top ignores free L2', function() {
				const locked = {"none":[0,0,0,0], "bottom":[0,0,0,0], "top":[1,0,0,0], "full":[0,0,0,0]};
				const free = {"none":[1,1,0,0], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(0);
				expect(result.progress).toBe(1);
			});

			it('one L2 bot ignores free L3', function() {
				const locked = {"none":[0,0,0,0], "bottom":[0,1,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const free = {"none":[0,1,1,0], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(0);
				expect(result.progress).toBe(1);
			});

			it('one L2 top ignores free L3', function() {
				const locked = {"none":[0,0,0,0], "bottom":[0,0,0,0], "top":[0,1,0,0], "full":[0,0,0,0]};
				const free = {"none":[0,1,1,0], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(0);
				expect(result.progress).toBe(1);
			});

			it('one L3 bot ignores free L4', function() {
				const locked = {"none":[0,0,0,0], "bottom":[0,0,1,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const free = {"none":[0,0,1,1], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(0);
				expect(result.progress).toBe(1);
			});

			it('one L3 top ignores free L4', function() {
				const locked = {"none":[0,0,0,0], "bottom":[0,0,0,0], "top":[0,0,1,0], "full":[0,0,0,0]};
				const free = {"none":[0,0,1,1], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(0);
				expect(result.progress).toBe(1);
			});


			it('gobble locked L4 bot with free', function() {
				const locked = {"none":[0,0,0,0], "bottom":[0,0,0,1], "top":[0,0,0,0], "full":[0,0,0,0]};
				const free = {"none":[0,0,0,1], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(0);
				expect(result.progress).toBe(2);
			});

			it('gobble locked L4 top with free', function() {
				const locked = {"none":[0,0,0,0], "bottom":[0,0,0,0], "top":[0,0,0,1], "full":[0,0,0,0]};
				const free = {"none":[0,0,0,1], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(0);
				expect(result.progress).toBe(2);
			});

			it('gobble locked L4 bots with free', function() {
				const locked = {"none":[0,0,0,0], "bottom":[0,0,0,2], "top":[0,0,0,0], "full":[0,0,0,0]};
				const free = {"none":[0,0,0,1], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(0);
				expect(result.progress).toBe(4);
				pending('Current implementation returns progress 2 instead of 4');
			});

			it('gobble locked L4 tops with free', function() {
				const locked = {"none":[0,0,0,0], "bottom":[0,0,0,0], "top":[0,0,0,2], "full":[0,0,0,0]};
				const free = {"none":[0,0,0,1], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(0);
				expect(result.progress).toBe(4);
				pending('Current implementation returns progress 2 instead of 4');
			});

			it('gobble locked L4 bot with bot', function() {
				const locked = {"none":[0,0,0,0], "bottom":[0,0,1,1], "top":[0,0,0,0], "full":[0,0,0,0]};
				const free = {"none":[0,0,1,0], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(0);
				expect(result.progress).toBe(3);
				pending('Current implementation returns progress 1 instead of 3');
			});

			it('gobble locked L4 top with top', function() {
				const locked = {"none":[0,0,0,0], "bottom":[0,0,0,0], "top":[0,0,1,1], "full":[0,0,0,0]};
				const free = {"none":[0,0,1,0], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(0);
				expect(result.progress).toBe(3);
				pending('Current implementation returns progress 1 instead of 3');
			});

			it('gobble locked L4 bots with bot', function() {
				const locked = {"none":[0,0,0,0], "bottom":[0,0,1,2], "top":[0,0,0,0], "full":[0,0,0,0]};
				const free = {"none":[0,0,1,0], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(0);
				expect(result.progress).toBe(5);
				pending('Current implementation returns progress 1 instead of 5');
			});

			it('gobble locked L4 tops with top', function() {
				const locked = {"none":[0,0,0,0], "bottom":[0,0,0,0], "top":[0,0,1,2], "full":[0,0,0,0]};
				const free = {"none":[0,0,1,0], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(0);
				expect(result.progress).toBe(5);
				pending('Current implementation returns progress 1 instead of 5');
			});

			it('gobble locked L4 bot with full', function() {
				const locked = {"none":[0,0,0,0], "bottom":[0,1,0,1], "top":[0,0,1,0], "full":[0,0,0,0]};
				const free = {"none":[0,1,0,0], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(3);
				expect(result.progress).toBe(4);
			});

			it('gobble locked L4 top with full', function() {
				const locked = {"none":[0,0,0,0], "bottom":[0,0,1,0], "top":[0,1,0,1], "full":[0,0,0,0]};
				const free = {"none":[0,1,0,0], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(3);
				expect(result.progress).toBe(4);
			});

			it('gobble locked L4 bots with full', function() {
				const locked = {"none":[0,0,0,0], "bottom":[0,1,0,2], "top":[0,0,1,0], "full":[0,0,0,0]};
				const free = {"none":[0,1,0,0], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(3);
				expect(result.progress).toBe(6);
			});

			it('gobble locked L4 tops with full', function() {
				const locked = {"none":[0,0,0,0], "bottom":[0,0,1,0], "top":[0,1,0,2], "full":[0,0,0,0]};
				const free = {"none":[0,1,0,0], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(3);
				expect(result.progress).toBe(6);
			});


			it('leave free L4 unmerged', function() {
				const locked = {"none":[0,0,0,0], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const free = {"none":[0,0,0,2], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(0);
				expect(result.progress).toBe(0);
			});

			it('leave free L4 unmerged in presence of merged key', function() {
				const locked = {"none":[0,0,0,0], "bottom":[0,0,0,1], "top":[0,0,0,1], "full":[0,0,0,0]};
				const free = {"none":[0,0,0,3], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(3);
				expect(result.progress).toBe(4);
			});

			it('leave free L1-4 unmerged', function() {
				const locked = {"none":[0,0,0,0], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const free = {"none":[0,0,0,3], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(0);
				expect(result.progress).toBe(0);
			});

			it('leave free L1-4 unmerged in presence of merged key', function() {
				const locked = {"none":[0,0,0,0], "bottom":[0,0,0,1], "top":[0,0,0,1], "full":[0,0,0,0]};
				const free = {"none":[2,2,2,3], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(3);
				expect(result.progress).toBe(4);
			});

			it('leave free L1-2, merge free L3 for L4 key', function() {
				const locked = {"none":[0,0,0,0], "bottom":[0,0,0,1], "top":[0,0,0,1], "full":[0,0,0,0]};
				const free = {"none":[2,2,4,0], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(3);
				expect(result.progress).toBe(4);
			});

			it('leave free L2 bot unmerged, merge free L2 for L4 key', function() {
				const locked = {"none":[0,0,0,0], "bottom":[2,0,0,1], "top":[0,0,0,1], "full":[0,0,0,0]};
				const free = {"none":[2,2,1,0], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(3);
				expect(result.progress).toBe(6);
			});

			it('leave free L2 top unmerged, merge free L2 for L4 key', function() {
				const locked = {"none":[0,0,0,0], "bottom":[0,0,0,1], "top":[2,0,0,1], "full":[0,0,0,0]};
				const free = {"none":[2,2,1,0], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(3);
				expect(result.progress).toBe(6);
			});


			it('unmerged top is better than unmerged empty', function() {
				const locked = {"none":[0,0,0,0], "bottom":[0,0,0,1], "top":[1,0,0,1], "full":[0,0,0,0]};
				const free = {"none":[1,2,1,0], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(3);
				expect(result.progress).toBe(5);
			});

			it('unmerged bot is better than unmerged empty', function() {
				const locked = {"none":[0,0,0,0], "bottom":[1,0,0,1], "top":[0,0,0,1], "full":[0,0,0,0]};
				const free = {"none":[1,2,1,0], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(3);
				expect(result.progress).toBe(5);
			});

			it('one unmerged top is better than two unmerged empties', function() {
				const locked = {"none":[0,0,0,0], "bottom":[0,0,0,1], "top":[1,0,0,1], "full":[0,0,0,0]};
				const free = {"none":[3,1,1,0], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(3);
				expect(result.progress).toBe(5);
			});

			it('one unmerged bot is better than two unmerged empties', function() {
				const locked = {"none":[0,0,0,0], "bottom":[1,0,0,1], "top":[0,0,0,1], "full":[0,0,0,0]};
				const free = {"none":[3,1,1,0], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(3);
				expect(result.progress).toBe(5);
			});
		});

		describe('(full)', function() {
			// full boards gotten from the game and/or comments at https://www.mooingcatguides.com/event-guides/2023-anniversary-event-guide#comments
			//   usually simpler, for which a bruteforce solver is quick
			it('comment-6152735906 by Stella Yolanda Zonker', function() {
				const locked = {"none":[0,0,0,0], "bottom":[2,1,0,0], "top":[2,2,1,1], "full":[0,0,0,0]};
				const free = {"none":[0,0,1,0], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(0);
				expect(result.progress).toBe(3);
				pending('Current implementation returns progress 1 instead of 3');
			});

			it('comment-6151362161 by szevasz', function() {
				const locked = {"none":[0,0,0,0], "bottom":[0,0,1,0], "top":[1,0,2,1], "full":[0,0,0,0]};
				const free = {"none":[2,2,0,0], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(3);
				expect(result.progress).toBe(4);
			});

			it('comment-6149249510 by Muche', function() {
				const locked = {"none":[0,0,0,0], "bottom":[3,1,0,1], "top":[4,0,0,0], "full":[0,0,0,0]};
				const free = {"none":[3,0,1,0], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(4);
				expect(result.progress).toBe(6);
			});

			it('comment-6148461376 by Stella Yolanda Zonker', function() {
				const locked = {"none":[0,0,0,0], "bottom":[1,2,0,1], "top":[0,0,2,0], "full":[0,0,0,0]};
				const free = {"none":[1,0,0,0], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(3);
				expect(result.progress).toBe(5);
			});

			it('comment-6148124724 by Max Barbarian', function() {
				const locked = {"none":[0,0,0,0], "bottom":[1,2,1,3], "top":[0,1,2,0], "full":[0,0,0,0]};
				const free = {"none":[0,1,1,1], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(6);
				expect(result.progress).toBe(9);
			});

			it('comment-6153869993 by Stella Yolanda Zonker', function() {
				const locked = {"none":[0,0,0,0], "bottom":[0,2,2,1], "top":[3,1,1,0], "full":[0,0,0,0]};
				const free = {"none":[4,1,0,0], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(9);
				expect(result.progress).toBe(11);
			});

			it('comment-6155079334 by MarkusS', function() {
				const locked = {"none":[0,0,0,0], "bottom":[1,0,0,2], "top":[1,3,2,0], "full":[0,0,0,0]};
				const free = {"none":[4,0,0,0], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(7);
				expect(result.progress).toBe(11);
			});

			it('comment-6159840011 by Max Barbarian', function() {
				const locked = {"none":[0,0,0,0], "bottom":[1,1,3,2], "top":[1,2,3,0], "full":[0,0,0,0]};
				const free = {"none":[1,1,0,1], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(6);
				expect(result.progress).toBe(9);
			});

			it('tc1', function() {
				const locked = {"none":[0,0,0,0], "bottom":[0,3,1,3], "top":[1,0,0,0], "full":[0,0,0,0]};
				const free = {"none":[1,0,1,1], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(3);
				expect(result.progress).toBe(9);
			});

			it('tc2', function() {
				const locked = {"none":[0,0,0,0], "bottom":[2,0,2,3], "top":[1,0,1,0], "full":[0,0,0,0]};
				const free = {"none":[4,0,2,1], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(6);
				expect(result.progress).toBe(12);
			});

			it('tc3', function() {
				const locked = {"none":[0,0,0,0], "bottom":[2,0,0,2], "top":[0,0,1,1], "full":[0,0,0,0]};
				const free = {"none":[4,0,0,2], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(6);
				expect(result.progress).toBe(9);
			});

			it('tc4', function() {
				const locked = {"none":[0,0,0,0], "bottom":[0,1,0,0], "top":[0,3,1,1], "full":[0,0,0,0]};
				const free = {"none":[3,1,1,2], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(3);
				expect(result.progress).toBe(5);
			});

			it('tc5', function() {
				const locked = {"none":[0,0,0,0], "bottom":[0,1,0,0], "top":[3,3,3,2], "full":[0,0,0,0]};
				const free = {"none":[1,3,2,2], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(3);
				expect(result.progress).toBe(12);
			});

			it('tc6', function() {
				const locked = {"none":[0,0,0,0], "bottom":[2,1,1,0], "top":[5,0,0,0], "full":[0,0,0,0]};
				const free = {"none":[4,2,0,0], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(6);
				expect(result.progress).toBe(6);
			});

			it('tc7', function() {
				const locked = {"none":[0,0,0,0], "bottom":[0,3,0,0], "top":[0,3,0,0], "full":[0,0,0,0]};
				const free = {"none":[2,1,1,1], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(3);
				expect(result.progress).toBe(2);
			});

			it('tc9', function() {
				const locked = {"none":[0,0,0,0], "bottom":[0,1,0,1], "top":[1,0,0,2], "full":[0,0,0,0]};
				const free = {"none":[1,1,0,0], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(1);
				expect(result.progress).toBe(2);
			});

			it('tc11', function() {
				const locked = {"none":[0,0,0,0], "bottom":[3,2,2,1], "top":[5,1,0,0], "full":[0,0,0,0]};
				const free = {"none":[3,0,1,1], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(9);
				expect(result.progress).toBe(10);
			});

			it('tc12', function() {
				const locked = {"none":[0,0,0,0], "bottom":[1,0,0,2], "top":[1,3,0,1], "full":[0,0,0,0]};
				const free = {"none":[0,2,1,0], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(3);
				expect(result.progress).toBe(8);
			});

			it('tc15', function() {
				const locked = {"none":[0,0,0,0], "bottom":[3,1,2,0], "top":[3,2,0,1], "full":[0,0,0,0]};
				const free = {"none":[1,1,0,0], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(6);
				expect(result.progress).toBe(7);
			});

			it('tc16', function() {
				const locked = {"none":[0,0,0,0], "bottom":[1,1,0,2], "top":[1,2,1,0], "full":[0,0,0,0]};
				const free = {"none":[1,0,1,1], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(4);
				expect(result.progress).toBe(7);
			});

			it('tc17', function() {
				const locked = {"none":[0,0,0,0], "bottom":[1,0,2,2], "top":[0,2,2,1], "full":[0,0,0,0]};
				const free = {"none":[3,1,0,1], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(9);
				expect(result.progress).toBe(11);
			});

			it('tc18', function() {
				const locked = {"none":[0,0,0,0], "bottom":[3,1,1,0], "top":[2,3,0,1], "full":[0,0,0,0]};
				const free = {"none":[2,2,1,0], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(9);
				expect(result.progress).toBe(9);
			});

			it('tc19', function() {
				const locked = {"none":[0,0,0,0], "bottom":[1,3,0,3], "top":[0,0,2,1], "full":[0,0,0,0]};
				const free = {"none":[3,0,0,0], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(6);
				expect(result.progress).toBe(13);
			});

			it('tc20', function() {
				const locked = {"none":[0,0,0,0], "bottom":[4,0,1,3], "top":[3,0,0,0], "full":[0,0,0,0]};
				const free = {"none":[2,0,0,0], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(3);
				expect(result.progress).toBe(9);
			});

			it('tc21', function() {
				const locked = {"none":[0,0,0,0], "bottom":[3,0,1,2], "top":[0,3,0,0], "full":[0,0,0,0]};
				const free = {"none":[5,0,3,0], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(9);
				expect(result.progress).toBe(11);
			});

			it('tc22', function() {
				const locked = {"none":[0,0,0,0], "bottom":[1,3,0,0], "top":[1,1,2,3], "full":[0,0,0,0]};
				const free = {"none":[3,0,0,0], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(6);
				expect(result.progress).toBe(12);
			});

			it('tc23', function() {
				const locked = {"none":[0,0,0,0], "bottom":[3,2,3,0], "top":[1,2,0,1], "full":[0,0,0,0]};
				const free = {"none":[3,0,0,0], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(9);
				expect(result.progress).toBe(11);
			});

			it('tc28', function() {
				const locked = {"none":[0,0,0,0], "bottom":[0,1,3,0], "top":[1,0,0,2], "full":[0,0,0,0]};
				const free = {"none":[4,0,1,0], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(6);
				expect(result.progress).toBe(8);
			});

			it('tc29', function() {
				const locked = {"none":[0,0,0,0], "bottom":[1,2,2,2], "top":[3,1,0,1], "full":[0,0,0,0]};
				const free = {"none":[2,1,0,0], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(7);
				expect(result.progress).toBe(13);
			});

			it('tc30', function() {
				const locked = {"none":[0,0,0,0], "bottom":[2,0,2,1], "top":[2,1,1,2], "full":[0,0,0,0]};
				const free = {"none":[4,0,1,0], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(9);
				expect(result.progress).toBe(14);
			});

			it('tc31', function() {
				const locked = {"none":[0,0,0,0], "bottom":[3,1,3,1], "top":[2,1,0,1], "full":[0,0,0,0]};
				const free = {"none":[6,1,0,0], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(10);
				expect(result.progress).toBe(14);
			});

			it('tc32', function() {
				const locked = {"none":[0,0,0,0], "bottom":[1,1,1,0], "top":[3,1,1,1], "full":[0,0,0,0]};
				const free = {"none":[4,0,0,1], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(7);
				expect(result.progress).toBe(10);
			});

			it('tc33', function() {
				const locked = {"none":[0,0,0,0], "bottom":[0,2,2,1], "top":[3,2,0,0], "full":[0,0,0,0]};
				const free = {"none":[4,2,1,0], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(10);
				expect(result.progress).toBe(11);
			});

			it('tc34', function() {
				const locked = {"none":[0,0,0,0], "bottom":[1,2,0,1], "top":[1,4,3,0], "full":[0,0,0,0]};
				const free = {"none":[4,1,0,0], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(10);
				expect(result.progress).toBe(11);
			});

			it('tc35', function() {
				const locked = {"none":[0,0,0,0], "bottom":[2,0,2,3], "top":[1,1,0,1], "full":[0,0,0,0]};
				const free = {"none":[1,1,2,0], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(6);
				expect(result.progress).toBe(12);
			});

			it('tc36', function() {
				const locked = {"none":[0,0,0,0], "bottom":[1,0,1,0], "top":[1,2,1,3], "full":[0,0,0,0]};
				const free = {"none":[1,0,0,1], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(3);
				expect(result.progress).toBe(9);
			});

			it('tc38', function() {
				const locked = {"none":[0,0,0,0], "bottom":[1,1,1,0], "top":[1,1,0,0], "full":[0,0,0,0]};
				const free = {"none":[2,3,1,0], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(6);
				expect(result.progress).toBe(5);
			});

			it('tc39', function() {
				const locked = {"none":[0,0,0,0], "bottom":[0,0,0,0], "top":[3,0,0,1], "full":[0,0,0,0]};
				const free = {"none":[1,1,1,1], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(0);
				expect(result.progress).toBe(3);
			});

			it('tc40', function() {
				const locked = {"none":[0,0,0,0], "bottom":[0,2,0,1], "top":[4,3,5,0], "full":[0,0,0,0]};
				const free = {"none":[2,2,4,1], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(9);
				expect(result.progress).toBe(13);
			});

			it('tc41', function() {
				const locked = {"none":[0,0,0,0], "bottom":[1,3,1,2], "top":[2,2,1,1], "full":[0,0,0,0]};
				const free = {"none":[3,0,0,0], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(7);
				expect(result.progress).toBe(14);
			});

			it('tc42', function() {
				const locked = {"none":[0,0,0,0], "bottom":[3,0,5,0], "top":[2,2,2,0], "full":[0,0,0,0]};
				const free = {"none":[0,2,0,0], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(6);
				expect(result.progress).toBe(4);
			});

			it('tc44', function() {
				const locked = {"none":[0,0,0,0], "bottom":[1,1,0,0], "top":[4,2,0,0], "full":[0,0,0,0]};
				const free = {"none":[2,1,2,0], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(6);
				expect(result.progress).toBe(5);
			});

			it('tc45', function() {
				const locked = {"none":[0,0,0,0], "bottom":[0,0,0,2], "top":[1,0,0,0], "full":[0,0,0,0]};
				const free = {"none":[3,0,2,0], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(3);
				expect(result.progress).toBe(5);
			});

			it('tc46', function() {
				const locked = {"none":[0,0,0,0], "bottom":[2,1,1,0], "top":[0,3,0,0], "full":[0,0,0,0]};
				const free = {"none":[4,2,1,0], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(9);
				expect(result.progress).toBe(7);
			});

			it('tc48', function() {
				const locked = {"none":[0,0,0,0], "bottom":[2,0,1,0], "top":[1,0,1,1], "full":[0,0,0,0]};
				const free = {"none":[4,2,0,1], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(6);
				expect(result.progress).toBe(7);
			});

			it('tc49', function() {
				const locked = {"none":[0,0,0,0], "bottom":[4,2,5,1], "top":[1,1,1,1], "full":[0,0,0,0]};
				const free = {"none":[1,2,0,0], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(9);
				expect(result.progress).toBe(11);
			});

			it('tc50', function() {
				const locked = {"none":[0,0,0,0], "bottom":[1,2,0,0], "top":[2,1,2,2], "full":[0,0,0,0]};
				const free = {"none":[5,1,0,0], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(9);
				expect(result.progress).toBe(12);
			});

			it('tc51', function() {
				const locked = {"none":[0,0,0,0], "bottom":[3,2,0,1], "top":[1,1,1,2], "full":[0,0,0,0]};
				const free = {"none":[4,0,0,1], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(9);
				expect(result.progress).toBe(14);
			});

			it('tc52', function() {
				const locked = {"none":[0,0,0,0], "bottom":[1,3,1,0], "top":[4,0,1,0], "full":[0,0,0,0]};
				const free = {"none":[2,1,1,1], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(9);
				expect(result.progress).toBe(7);
			});

			it('tc53', function() {
				const locked = {"none":[0,0,0,0], "bottom":[0,0,3,2], "top":[2,1,2,1], "full":[0,0,0,0]};
				const free = {"none":[2,1,2,1], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(12);
				expect(result.progress).toBe(13);
			});

			it('tc54', function() {
				const locked = {"none":[0,0,0,0], "bottom":[2,1,1,0], "top":[0,1,1,2], "full":[0,0,0,0]};
				const free = {"none":[2,0,1,1], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(7);
				expect(result.progress).toBe(10);
			});

			it('tc55', function() {
				const locked = {"none":[0,0,0,0], "bottom":[1,2,3,1], "top":[2,1,1,1], "full":[0,0,0,0]};
				const free = {"none":[4,0,1,1], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(12);
				expect(result.progress).toBe(14);
			});

			it('tc56', function() {
				const locked = {"none":[0,0,0,0], "bottom":[2,2,2,1], "top":[3,1,0,1], "full":[0,0,0,0]};
				const free = {"none":[5,0,2,0], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(12);
				expect(result.progress).toBe(14);
			});
		});

		describe('(full perf)', function() {
			// full boards gotten from the game and/or comments at https://www.mooingcatguides.com/event-guides/2023-anniversary-event-guide#comments
			//   usually more complex, for which a bruteforce solver can be slow
			it('comment-6153598555 by Centaurus', function() {
				const locked = {"none":[0,0,0,0], "bottom":[3,3,0,2], "top":[4,3,1,1], "full":[0,0,0,0]};
				const free = {"none":[1,2,1,1], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(10);
				expect(result.progress).toBe(11);
			});

			it('comment-6149964806 by Muche', function() {
				const locked = {"none":[0,0,0,0], "bottom":[1,1,1,2], "top":[2,5,1,1], "full":[0,0,0,0]};
				const free = {"none":[4,0,3,1], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(15);
				expect(result.progress).toBe(14);
			});

			it('comment-6147057517 by Rigel Blue', function() {
				const locked = {"none":[0,0,0,0], "bottom":[4,0,1,2], "top":[2,1,2,1], "full":[0,0,0,0]};
				const free = {"none":[2,6,1,1], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(12);
				expect(result.progress).toBe(12);
			});

			it('tc8', function() {
				const locked = {"none":[0,0,0,0], "bottom":[3,4,4,1], "top":[1,3,0,1], "full":[0,0,0,0]};
				const free = {"none":[4,1,0,0], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(13);
				expect(result.progress).toBe(17);
			});

			it('tc10', function() {
				const locked = {"none":[0,0,0,0], "bottom":[2,2,4,1], "top":[1,0,2,1], "full":[0,0,0,0]};
				const free = {"none":[9,0,1,0], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(12);
				expect(result.progress).toBe(14);
			});

			it('tc13', function() {
				const locked = {"none":[0,0,0,0], "bottom":[1,1,1,0], "top":[1,1,1,3], "full":[0,0,0,0]};
				const free = {"none":[5,1,1,1], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(9);
				expect(result.progress).toBe(12);
			});

			it('tc14', function() {
				const locked = {"none":[0,0,0,0], "bottom":[2,3,1,0], "top":[2,0,1,2], "full":[0,0,0,0]};
				const free = {"none":[2,3,2,0], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(12);
				expect(result.progress).toBe(11);
			});

			it('tc24', function() {
				const locked = {"none":[0,0,0,0], "bottom":[2,2,3,2], "top":[2,4,2,0], "full":[0,0,0,0]};
				const free = {"none":[5,3,1,0], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(18);
				expect(result.progress).toBe(19);
			});

			it('tc25', function() {
				const locked = {"none":[0,0,0,0], "bottom":[1,1,2,4], "top":[2,2,0,2], "full":[0,0,0,0]};
				const free = {"none":[3,1,4,0], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(13);
				expect(result.progress).toBe(20);
			});

			it('tc26', function() {
				const locked = {"none":[0,0,0,0], "bottom":[1,3,2,1], "top":[2,2,2,1], "full":[0,0,0,0]};
				const free = {"none":[7,0,4,0], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(19);
				expect(result.progress).toBe(16);
			});

			it('tc27', function() {
				const locked = {"none":[0,0,0,0], "bottom":[0,1,2,2], "top":[3,3,1,1], "full":[0,0,0,0]};
				const free = {"none":[3,1,4,0], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(15);
				expect(result.progress).toBe(16);
			});

			it('tc37', function() {
				const locked = {"none":[0,0,0,0], "bottom":[1,2,5,3], "top":[1,2,4,0], "full":[0,0,0,0]};
				const free = {"none":[3,2,2,1], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(18);
				expect(result.progress).toBe(18);
			});

			it('tc43', function() {
				const locked = {"none":[0,0,0,0], "bottom":[2,1,1,2], "top":[1,1,1,1], "full":[0,0,0,0]};
				const free = {"none":[4,3,2,0], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(12);
				expect(result.progress).toBe(13);
			});

			it('tc47', function() {
				const locked = {"none":[0,0,0,0], "bottom":[1,6,2,4], "top":[1,2,3,3], "full":[0,0,0,0]};
				const free = {"none":[6,6,0,0], "bottom":[0,0,0,0], "top":[0,0,0,0], "full":[0,0,0,0]};
				const result = mergerGame.solver1(locked, free);

				expect(result.keys).toBe(21);
				expect(result.progress).toBe(29);
			});
		});
	});
});
