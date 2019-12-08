
$(function(){

	// alles aus der URL fischen, auch den vorhandenen Text
	let urlParams = Object.fromEntries( new URLSearchParams(location.search) );

	// console.log('urlParams: ', urlParams);

	$('body').on('click', '.btn-cancel', function(){
		parent.postMessage('closeBox', "*");
	});

	$('body').on('click', '.btn-save', function(){
		parent.postMessage($('#text-box').val(), "*");
	});
});
