function clamp(num, min, max) {
	return num <= min ? min : num >= max ? max : num;
}
$(document).ready(function(e) {
	(async () => {

		$('#venue').append(`<style id="colors">.ticket_00{background:#d0d0d0}</style>`);
		const response = await fetch('data.json');
		const json = await response.json();

		var c = {
			Dragging: false,
			Scale: 1,
			PinchDist: 0,
			Translate: {
				x: 0,
				y: 0
			},
			Mouse: {
				x: 0,
				y: 0
			},
			VenueSize: {
				x: 0,
				y: 0
			},
			WrapperSize: {
				width: $('#venueElement').width(),
				height: $('#venueElement').height()
			},
		};

		json.data.venue.pcds.forEach(category => {

			let color = category.c;
			color = +("0x" + color.slice(1).replace(color.length < 5 && /./g, '$&$&'));
			r = color >> 16, g = color >> 8 & 255, b = color & 255;
			hsp = Math.sqrt(0.299 * (r * r) + 0.587 * (g * g) + 0.114 * (b * b));
			color = hsp > 135.5 ? 'black' : 'white';

			$('#colors').append(`.ticket_${category.id}{background:${category.c};color:${color}}`);

		});

		let venueStart = [99999, 99999];
		let auxTextContainer = "";
		json.data.venue.ss[0].ls.forEach(label => {
			auxTextContainer += `<div data-id="${label.id}" style="left:${label.x}; top:${label.y};${label.s}" class="label"><span>${label.l}</span></div>`;
			if (venueStart[0] > label.x) venueStart[0] = label.x;
			if (venueStart[1] > label.y) venueStart[1] = label.y;
			if (c.VenueSize.x < label.x) c.VenueSize.x = label.x;
			if (c.VenueSize.y < label.y) c.VenueSize.y = label.y;
		});
		$('#loading').css('display', 'none');
		$('#venueItems').append(auxTextContainer);
		auxTextContainer = "";
		json.data.venue.ss[0].s.forEach(ticket => {
			auxTextContainer += `<div data-id="${ticket.id}" style="left:${ticket.x}; top:${ticket.y};" class="ticket ` + (ticket.s != "0" ? 'ticket_00 ticketState'+ticket.s : `ticket_${ticket.p}`) + `"><span>${ticket.l}</span></div>`;
			if (venueStart[0] > ticket.x) venueStart[0] = ticket.x;
			if (venueStart[1] > ticket.y) venueStart[1] = ticket.y;
			if (c.VenueSize.x < ticket.x) c.VenueSize.x = ticket.x;
			if (c.VenueSize.y < ticket.y) c.VenueSize.y = ticket.y;
		});
		$('#venueItems').append(auxTextContainer);
		c.VenueSize.x += venueStart[0];
		c.VenueSize.y += venueStart[1];

		var clickTime = 0;
		$('#venueItems div:not(.ticket_00)').on('touchstart', function(e) {
			if (e.originalEvent.touches.length === 1)
				clickTime = Date.now();
		});
		$('#venueItems div:not(.ticket_00)').on('click touchend', function(e) {
			//e.stopPropagation();
			e.preventDefault();
			if (e.type == 'touchend') {
				clickTime = Date.now() - clickTime;
				if (clickTime < 350)
					$(this).toggleClass('selected');

			} else
				$(this).toggleClass('selected');

		});

		/**
		 * 
		 * Zooming
		 * 
		 */
		let zoomVenue = (scale, x, y, size) => {
			c.Scale += scale; //(scale > 0 ? 0.2 : -0.2);

			if (size) {
				c.Scale = size;
				c.Translate.x = (c.WrapperSize.width / 2) - (c.VenueSize.x / 2);
				c.Translate.y = (c.WrapperSize.height / 2) - (c.VenueSize.y / 2);
			}
			c.Scale = clamp(c.Scale, 0.4, 5);
			if (typeof x !== 'undefined' && typeof y !== 'undefined' && !size) {
				let center = [$('#venueZoom').width() / 2, $('#venueZoom').height() / 2];
				if (scale > 0) {
					c.Translate.x += ((center[0] - x) / (c.Scale) / 5);
					c.Translate.y +=  ((center[1] - y) / (c.Scale)/ 5);
				} else {
					c.Translate.x -= -((center[0] - x) / 2 / (c.Scale) / 5);
					c.Translate.y -= -((center[1] - y) / 2 / (c.Scale) / 5);

				}
			}
			$('#venueZoom').css('transform', `scale(${c.Scale})`);
			$('#venue').css('transform', `translate(${c.Translate.x}px, ${c.Translate.y}px)`);
		}

		zoomVenue(-1, c.VenueSize.x, c.VenueSize.y, (c.WrapperSize.width < c.WrapperSize.height ? c.WrapperSize.width / 1000 * 1.2 : c.WrapperSize.height / 1000 * 1.2));
		$('#venue').width(c.VenueSize.x);
		$('#venue').height(c.VenueSize.y);
		$(window).resize(function() {

			c.WrapperSize = {
				width: $('#venueElement').width(),
				height: $('#venueElement').height()
			};
			zoomVenue(-1, c.VenueSize.x, c.VenueSize.y, (c.WrapperSize.width < c.WrapperSize.height ? c.WrapperSize.width / 1000 * 1.2 : c.WrapperSize.height / 1000 * 1.2));
		});
		$('#zoomIn').on('click touchend', function() {
			zoomVenue(0.5)
		});
		$('#zoomOut').on('click touchend', function() {
			zoomVenue(-0.5)
		});
		$('#zoomReset').on('click touchend', function() {
            zoomVenue(-1, c.VenueSize.x, c.VenueSize.y, (c.WrapperSize.width < c.WrapperSize.height ? c.WrapperSize.width / 1000 * 1.2 : c.WrapperSize.height / 1000 * 1.2));
		});

		/**
		 * 
		 * Movement
		 * 
		 */
		$('#venueElement').bind('mousewheel DOMMouseScroll', function(e) {
			e.stopPropagation();
			e.preventDefault();
			$('#venueElement').addClass('zooming');
			zoomVenue((e.originalEvent.wheelDelta / 120) * 0.2, e.originalEvent.clientX, e.originalEvent.clientY);
		});

		var tapedTwice = false;
		$('#venueElement').bind('mousedown touchstart', function(e) {

			c.Dragging = true;
			$('#venueElement').removeClass('zooming');

			let mouse = !e.originalEvent.touches ? e : e.originalEvent.touches[0];
			c.Mouse.x = mouse.clientX;
			c.Mouse.y = mouse.clientY;

			/* DOUBLE TAP*/
			if (e.originalEvent.touches)
				if (e.originalEvent.touches.length > 1) {
					$('#venueElement').addClass('zooming');
					return 1;
				}

			if (!tapedTwice) {
				tapedTwice = true;
				setTimeout(function() {
					tapedTwice = false;
				}, 300);
				return false;
			}
			e.preventDefault();
			c.Scale += 1.5;
			let center = [$('#venueElement').width() / 2, $('#venueElement').height() / 2];
			if (c.Scale < 2.5) {
				c.Translate.x += (center[0] - mouse.clientX);
				c.Translate.y += (center[1] - mouse.clientY);
			}
			$('#venue').css('transform', `translate(${c.Translate.x}px, ${c.Translate.y}px)`);
			$('#venueZoom').css('transform', `scale(${c.Scale})`);


		}).bind('mouseup touchend mouseleave', function(e) {
			c.Dragging = false;
			c.PinchDist = 0;
			$('#venueElement').removeClass('zooming');
		}).bind('mousemove touchmove', function(e) {

			if (c.Dragging) {
				e.stopPropagation();
				e.preventDefault();
				if (e.type === 'touchmove') {
					if (e.originalEvent.touches.length === 2) {
						let newPinch = Math.hypot(
							e.originalEvent.touches[0].pageX - e.originalEvent.touches[1].pageX,
							e.originalEvent.touches[0].pageY - e.originalEvent.touches[1].pageY);
						if (c.PinchDist) {
							if (c.PinchDist - newPinch > 40) {
								zoomVenue(-0.2);
								c.PinchDist = newPinch;
							} else if (c.PinchDist - newPinch < -40) {
								zoomVenue(0.4);
								c.PinchDist = newPinch;
							}
						} else
							c.PinchDist = newPinch;
						return 1;
					}
				}
				if (!e) e = window.event;
				let mouse = !e.originalEvent.touches ? e.originalEvent : e.originalEvent.touches[0];
				let newX = c.Translate.x + ((mouse.clientX - c.Mouse.x) / c.Scale * 1.2);
				let newY = c.Translate.y + ((mouse.clientY - c.Mouse.y) / c.Scale * 1.2);

				$('#venue').css('transform', `translate(${newX}px, ${newY}px)`);
				c.Mouse.x = mouse.clientX;
				c.Mouse.y = mouse.clientY;

				c.Translate.x = newX;
				c.Translate.y = newY;

			}

		});

	})();
});