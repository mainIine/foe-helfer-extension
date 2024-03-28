var tt = {
	/**
	 * Returns full filename (including parent folders) of the file currently being executed
	 *
	 * @returns {string}
	 */
	getFilename() {
		const frames = new jasmine.StackTrace(new Error()).frames;
		return frames[1] ? frames[1].file : frames.join('|');
	},

	/**
	 * Returns filename (without extension) of the file currently being executed
	 *  usually used to uniquely identify module suite name
	 *
	 * @returns {string}
	 */
	getModuleSuiteName() {
		const frames = new jasmine.StackTrace(new Error()).frames;
		const filename = frames[1] && frames[1].file || '';
		const result = filename.match(/.*\/(.*)\.[^\.]+$/);
		return result ? result[1] : filename;
	}
};
