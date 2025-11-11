// Ensure fade-only slider mode is on before any immediate-invoked sliders run
window.__fadeSliderActive = true;

document.addEventListener('DOMContentLoaded', () => {
	const yearEl = document.getElementById('year');
	if (yearEl) yearEl.textContent = new Date().getFullYear().toString();

	// Make logo clickable → redirect to index
	Array.from(document.querySelectorAll('img'))
		.filter(img => /(^|\/|\\)logo\.webp$/i.test(img.getAttribute('src') || ''))
		.forEach(img => {
			img.style.cursor = 'pointer';
			img.addEventListener('click', (e) => {
				e.preventDefault();
				e.stopPropagation();
				window.location.href = './index.html';
			});
		});

	const mobileBtn = document.getElementById('mobileMenuButton');
	const mobileDots = document.getElementById('mobileDotsButton');
	const mobileMenu = document.getElementById('mobileMenu');
	const toggleMobile = () => {
		if (!mobileMenu) return;
		mobileMenu.classList.toggle('hidden');
		const expanded = mobileMenu.classList.contains('hidden') ? 'false' : 'true';
		if (mobileDots) mobileDots.setAttribute('aria-expanded', expanded);
		if (mobileBtn) mobileBtn.setAttribute('aria-expanded', expanded);
	};
	if (mobileBtn) mobileBtn.addEventListener('click', toggleMobile);
	if (mobileDots) mobileDots.addEventListener('click', toggleMobile);

	// Slider
	const track = document.getElementById('sliderTrack');
	if (track) {
		const slides = Array.from(track.children);
		const prevBtn = document.getElementById('slidePrev');
		const nextBtn = document.getElementById('slideNext');
		let index = 0;
		let timerId = null;
		let isAnimating = false;
		let previousIndex = 0;
		let dots = [];

		// Fade-only setup: overlay slides, no translateX
		track.style.position = 'relative';
		track.style.transform = 'none';
		track.style.transition = 'none';
		track.style.zIndex = '0';
		slides.forEach((slide, i) => {
			slide.style.position = 'absolute';
			slide.style.inset = '0';
			slide.style.width = '100%';
			slide.style.opacity = i === 0 ? '1' : '0';
			slide.style.zIndex = i === 0 ? '1' : '0';
			slide.style.pointerEvents = i === 0 ? 'auto' : 'none';
			slide.style.visibility = i === 0 ? 'visible' : 'hidden';
			slide.style.transition = 'opacity 1000ms ease-in-out';
			slide.style.willChange = 'opacity';
		});

		function applyFade(activeIndex) {
			// Force reflow to ensure transitions apply consistently
			// eslint-disable-next-line no-unused-expressions
			track.offsetHeight;
			slides.forEach((slide, i) => {
				const isActive = i === activeIndex;
				slide.style.opacity = isActive ? '1' : '0';
				slide.style.zIndex = isActive ? '1' : '0';
				slide.style.pointerEvents = isActive ? 'auto' : 'none';
				slide.style.visibility = 'visible';
			});
			// Hide the previous slide after fade completes to avoid stacking artifacts
			const hideIndex = previousIndex;
			setTimeout(() => {
				if (slides[hideIndex] && hideIndex !== activeIndex) {
					slides[hideIndex].style.visibility = 'hidden';
					slides[hideIndex].style.pointerEvents = 'none';
				}
			}, 1005);
		}

		function updateTrackHeight() {
			const active = slides[index];
			if (!active) return;
			const img = active.querySelector('img');
			let h = active.offsetHeight;
			if ((!h || h < 16) && img) h = img.offsetHeight;
			if (h && h > 0) track.style.height = h + 'px';
		}

		function setTransform() {
			// Apply fade based on current index
			applyFade(index);
			updateTrackHeight();
		}

		function updateDots() {
			if (dots.length === 0) return;

			dots.forEach((dot, i) => {
				if (!dot) return;

				// Remove all inline styles first
				dot.style.removeProperty('background-color');
				dot.style.removeProperty('opacity');
				dot.style.removeProperty('width');
				dot.style.removeProperty('height');
				dot.style.removeProperty('box-shadow');
				dot.style.removeProperty('border');

				if (i === index) {
					// Active dot: vibrant blue (matching image)
					dot.style.backgroundColor = '#3b82f6'; // vibrant blue
					dot.style.opacity = '1';
					dot.classList.add('active-dot');
					dot.classList.remove('inactive-dot');
				} else {
					// Inactive dots: muted light grey (matching image)
					dot.style.backgroundColor = '#d1d5db'; // muted light grey
					dot.style.opacity = '1';
					dot.classList.add('inactive-dot');
					dot.classList.remove('active-dot');
				}
			});
		}

		function go(nextIndex) {
			if (isAnimating) return;
			isAnimating = true;
			previousIndex = index;
			index = (nextIndex + slides.length) % slides.length;
			setTransform();
			updateDots();
			setTimeout(() => { isAnimating = false; }, 1020);
		}

		// Swipe to change slides (fade-only)
		(function attachSwipe() {
			let isDown = false;
			let startX = 0;
			let lastX = 0;
			function onDown(e) {
				isDown = true;
				startX = e.touches ? e.touches[0].clientX : e.clientX;
				lastX = startX;
			}
			function onMove(e) {
				if (!isDown) return;
				// Prevent page scroll while swiping horizontally
				if (e.cancelable) e.preventDefault();
				lastX = e.touches ? e.touches[0].clientX : e.clientX;
			}
			function onUp() {
				if (!isDown) return;
				const dx = lastX - startX;
				isDown = false;
				if (Math.abs(dx) > 40) {
					if (dx < 0) go(index + 1); else go(index - 1);
					restartAuto();
				}
			}
			track.addEventListener('mousedown', onDown);
			window.addEventListener('mousemove', onMove);
			window.addEventListener('mouseup', onUp);
			track.addEventListener('touchstart', onDown, { passive: false });
			track.addEventListener('touchmove', onMove, { passive: false });
			track.addEventListener('touchend', onUp);

			// Prevent native image drag interfering with swipe
			Array.from(track.querySelectorAll('img')).forEach(img => {
				img.addEventListener('dragstart', (e) => e.preventDefault());
			});
		})();

		function next() {
			go(index + 1);
		}

		function prev() {
			go(index - 1);
		}

		function startAuto() {
			stopAuto();
			timerId = setInterval(() => {
				if (!isAnimating) next();
			}, 10000);
		}

		function stopAuto() {
			if (timerId) clearInterval(timerId);
			timerId = null;
		}

		function restartAuto() {
			startAuto();
		}

		// Create dots inside the slider container (within slider range)
		function initDots() {
			const dotsContainer = document.querySelector('.slider-dots-container');
			if (!dotsContainer) {
				console.warn('Dots container not found');
				return;
			}

			// Clear existing dots
			dotsContainer.innerHTML = '';
			dots = [];

			// Create dots for each slide
			slides.forEach((slide, i) => {
				const dot = document.createElement('button');
				dot.className = 'slider-dot rounded-full w-2 h-2 sm:w-2.5 sm:h-2.5 transition-all duration-300';
				dot.setAttribute('data-index', i);
				dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
				dot.type = 'button'; // Prevent form submission
				dotsContainer.appendChild(dot);
				dots.push(dot);

				// Attach click event listener to each dot
				dot.addEventListener('click', (e) => {
					e.preventDefault();
					e.stopPropagation();
					go(i);
					restartAuto();
				});
			});

			// Initial dot update
			updateDots();
		}

		// No transform transition events needed for fade-only

		if (nextBtn) {
			nextBtn.addEventListener('click', (e) => {
				e.preventDefault();
				e.stopPropagation();
				next();
				restartAuto();
			});
		}

		if (prevBtn) {
			prevBtn.addEventListener('click', (e) => {
				e.preventDefault();
				e.stopPropagation();
				prev();
				restartAuto();
			});
		}

		// Initialize everything
		setTransform();
		// Update height on image load and on resize
		slides.forEach(slide => {
			const img = slide.querySelector('img');
			if (img) {
				if (img.complete) updateTrackHeight();
				else img.addEventListener('load', updateTrackHeight, { once: true });
			}
		});
		window.addEventListener('resize', updateTrackHeight);

		// Initialize dots - try multiple times to ensure DOM is ready
		setTimeout(() => {
			initDots();
		}, 50);

		setTimeout(() => {
			if (dots.length === 0) {
				initDots();
			}
		}, 200);

		startAuto();
		window.__fadeSliderActive = true;
	}

	// Overflow menu (vertical dots) for desktop nav
	const mainNav = document.getElementById('mainNav');
	const overflowWrapper = document.getElementById('overflowWrapper');
	const overflowBtn = document.getElementById('overflowBtn');
	const overflowDropdown = document.getElementById('overflowDropdown');
	const overflowList = document.getElementById('overflowList');

	if (mainNav && overflowWrapper && overflowBtn && overflowDropdown && overflowList) {
		function closeDropdown() {
			overflowDropdown.classList.add('hidden');
			overflowBtn.setAttribute('aria-expanded', 'false');
		}

		overflowBtn.addEventListener('click', (e) => {
			e.preventDefault();
			overflowDropdown.classList.toggle('hidden');
			overflowBtn.setAttribute('aria-expanded', overflowDropdown.classList.contains('hidden') ? 'false' : 'true');
		});

		document.addEventListener('click', (e) => {
			if (!overflowWrapper.contains(e.target)) closeDropdown();
		});

		function relayout() {
			Array.from(overflowList.children).forEach(li => { mainNav.insertBefore(li, overflowWrapper); });
			overflowWrapper.classList.add('hidden');
			closeDropdown();

			const navRect = mainNav.getBoundingClientRect();
			const items = Array.from(mainNav.querySelectorAll('li'))
				.filter(li => li.id !== 'overflowWrapper');
			let didOverflow = false;
			for (let i = 0; i < items.length; i++) {
				const li = items[i];
				const rect = li.getBoundingClientRect();
				if (rect.right > navRect.right) {
					didOverflow = true;
					for (let j = i; j < items.length; j++) {
						const move = items[j];
						if (move.parentElement === mainNav) {
							const clone = move.cloneNode(true);
							overflowList.appendChild(clone);
							mainNav.removeChild(move);
						}
					}
					break;
				}
			}
			if (didOverflow) overflowWrapper.classList.remove('hidden');
		}

		relayout();
		let resizeTimer = null;
		window.addEventListener('resize', () => {
			clearTimeout(resizeTimer);
			resizeTimer = setTimeout(relayout, 100);
		});
	}

	// Horizontal scroll hover pause and image modal
	const scrollContainer = document.getElementById('scrollContainer');
	const imageModal = document.getElementById('imageModal');
	const modalImage = document.getElementById('modalImage');
	const modalClose = document.getElementById('modalClose');
	const modalPrev = document.getElementById('modalPrev');
	const modalNext = document.getElementById('modalNext');
	const modalDots = document.getElementById('modalDots');

	if (scrollContainer) {
		// Swipe/drag control variables
		let isDragging = false;
		let startX = 0;
		let scrollLeft = 0;
		let animationOffset = 0;
		let isHovering = false;
		let resumeTimeout = null; // Store timeout for delayed resume

		// Get computed animation position
		function getAnimationPosition() {
			const style = window.getComputedStyle(scrollContainer);
			if (style.transform === 'none' || !style.transform) {
				return 0;
			}
			// Parse transform matrix or translate3d/translateX
			const matrixMatch = style.transform.match(/matrix\([^)]+\)/);
			if (matrixMatch) {
				const matrix = new DOMMatrix(style.transform);
				return matrix.m41 || 0; // translateX value
			}
			// Parse translate3d or translateX
			const translateMatch = style.transform.match(/translate3d?\(([^,]+),/);
			if (translateMatch) {
				return parseFloat(translateMatch[1].trim()) || 0;
			}
			return 0;
		}

		// Reset animation position for seamless loop
		function resetAnimationPosition() {
			if (isDragging || isHovering) return;
			const containerWidth = scrollContainer.scrollWidth / 2;
			const currentPos = getAnimationPosition();
			if (Math.abs(currentPos) >= containerWidth) {
				animationOffset = currentPos % containerWidth;
				scrollContainer.style.transform = `translate3d(${animationOffset}px, 0, 0)`;
				scrollContainer.style.animationDelay = '0s';
			}
		}

		// Update animation to continue from manual scroll position
		function syncAnimationFromPosition() {
			if (isDragging) return;
			
			// Use requestAnimationFrame for smooth transition
			requestAnimationFrame(() => {
				if (isDragging) return;
				
				const currentPos = getAnimationPosition();
				const containerWidth = scrollContainer.scrollWidth / 2;

				// Calculate percentage for animation (handle negative values)
				let normalizedPos = currentPos % containerWidth;
				if (normalizedPos > 0) {
					normalizedPos -= containerWidth;
				}
				const percent = Math.abs(normalizedPos) / containerWidth;
				
				// Set animation delay to sync with current position
				
				// Use requestAnimationFrame again to ensure smooth transition
				requestAnimationFrame(() => {
					// Clear inline transform to let CSS animation take over smoothly
					scrollContainer.style.transform = '';
					scrollContainer.style.transition = 'none'; // Ensure no transition interference
				});
			});
		}

		// Mouse/touch drag handlers for swipe control
		function handleStart(e) {
			// Don't start drag if clicking on an image (let hover work)
			if (e.target.tagName === 'IMG') {
				// Allow image hover to work, but still allow dragging from container
				const isImageClick = e.target.closest('.product-image-hover');
				if (isImageClick && e.type === 'mousedown') {
					// Small delay to check if it's a click or drag
					setTimeout(() => {
						if (!isDragging) {
							// It was just a click, allow default behavior
							return;
						}
					}, 100);
				}
			}

			// Clear any pending resume timeout when starting drag
			if (resumeTimeout) {
				clearTimeout(resumeTimeout);
				resumeTimeout = null;
			}

			isDragging = true;
			scrollContainer.classList.add('dragging');
			scrollContainer.classList.add('paused');

			const clientX = e.touches ? e.touches[0].clientX : e.clientX;
			startX = clientX;
			scrollLeft = getAnimationPosition();

			// Temporarily disable hover during drag
			scrollContainer.querySelectorAll('.product-image-hover').forEach(img => {
				img.classList.add('no-hover');
			});

			e.preventDefault();
		}

		function handleMove(e) {
			if (!isDragging) return;

			const clientX = e.touches ? e.touches[0].clientX : e.clientX;
			// Direct mapping: mouse moves right = content scrolls right
			// Mouse moves left = content scrolls left (following mouse direction)
			const walk = (clientX - startX) * 1.2; // Positive follows mouse direction
			const newPosition = scrollLeft + walk;

			// Apply manual scroll transform using translate3d for hardware acceleration
			scrollContainer.style.transform = `translate3d(${newPosition}px, 0, 0)`;
			animationOffset = newPosition;

			e.preventDefault();
		}

		function handleEnd(e) {
			if (!isDragging) return;

			isDragging = false;
			scrollContainer.classList.remove('dragging');

			// Re-enable hover after drag
			setTimeout(() => {
				scrollContainer.querySelectorAll('.product-image-hover').forEach(img => {
					img.classList.remove('no-hover');
				});
			}, 50);

			// Sync animation with current position and resume
			setTimeout(() => {
				if (!isHovering && !isDragging) {
					syncAnimationFromPosition();
					scrollContainer.classList.remove('paused');
					resetAnimationPosition();
				}
			}, 100);

			e.preventDefault();
		}

		// Mouse drag events
		scrollContainer.addEventListener('mousedown', handleStart);
		document.addEventListener('mousemove', handleMove);
		document.addEventListener('mouseup', handleEnd);

		// Touch/swipe events
		scrollContainer.addEventListener('touchstart', handleStart, { passive: false });
		scrollContainer.addEventListener('touchmove', handleMove, { passive: false });
		scrollContainer.addEventListener('touchend', handleEnd, { passive: false });

		// Helper function to pause animation and freeze position
		function pauseAnimation() {
			if (isDragging || isHovering) return;
			
			// Clear any pending resume timeout
			if (resumeTimeout) {
				clearTimeout(resumeTimeout);
				resumeTimeout = null;
			}
			
			isHovering = true;
			scrollContainer.classList.add('paused');
			
			// Use requestAnimationFrame to ensure smooth freeze
			requestAnimationFrame(() => {
				if (isDragging) return;
				
				// Capture current animation position and freeze it
				const currentPos = getAnimationPosition();
				const containerWidth = scrollContainer.scrollWidth / 2;
				
				// Calculate the actual position within the loop
				let frozenPos = currentPos % containerWidth;
				if (frozenPos > 0) {
					frozenPos -= containerWidth;
				}
				
				// Apply frozen position directly via transform using translate3d
				scrollContainer.style.transform = `translate3d(${frozenPos}px, 0, 0)`;
				scrollContainer.style.transition = 'none'; // Prevent transition during freeze
				animationOffset = frozenPos;
			});
		}

		// Helper function to resume animation
		function resumeAnimation() {
			if (isDragging) return;
			
			isHovering = false;
			
			// Use requestAnimationFrame for smooth resumption
			requestAnimationFrame(() => {
				if (isDragging) return;
				
				// Ensure no transition interference
				scrollContainer.style.transition = 'none';
				
				// Sync animation from current frozen position
				syncAnimationFromPosition();
				
				// Remove paused class to resume CSS animation
				requestAnimationFrame(() => {
					scrollContainer.classList.remove('paused');
				});
			});
		}

		// Also pause when hovering over individual images
		const productImages = scrollContainer.querySelectorAll('.product-image-hover');
		
		// Track mouse position relative to container
		let mouseOverContainer = false;
		
		// Pause on hover - capture current position and freeze animation
		scrollContainer.addEventListener('mouseenter', () => {
			mouseOverContainer = true;
			// Clear any pending resume timeout
			if (resumeTimeout) {
				clearTimeout(resumeTimeout);
				resumeTimeout = null;
			}
			pauseAnimation();
		});
		
		scrollContainer.addEventListener('mouseleave', () => {
			mouseOverContainer = false;
			// Clear any existing timeout and resume immediately
			if (resumeTimeout) {
				clearTimeout(resumeTimeout);
				resumeTimeout = null;
			}
			if (!isDragging && !mouseOverContainer) {
				resumeAnimation();
			}
		});
		
		productImages.forEach(img => {
			img.addEventListener('mouseenter', () => {
				if (!isDragging) {
					// Clear any pending resume timeout
					if (resumeTimeout) {
						clearTimeout(resumeTimeout);
						resumeTimeout = null;
					}
					pauseAnimation();
				}
			});
			
			img.addEventListener('mouseleave', () => {
				// Use requestAnimationFrame for immediate check after event bubbling
				requestAnimationFrame(() => {
					// If not over container anymore, resume immediately
					if (!isDragging && !mouseOverContainer && isHovering) {
						if (resumeTimeout) {
							clearTimeout(resumeTimeout);
							resumeTimeout = null;
						}
						resumeAnimation();
					}
				});
			});
		});

		// Image modal functionality
		const images = Array.from(scrollContainer.querySelectorAll('img'));
		let currentImageIndex = 0;

		// Create modal dots
		function createModalDots() {
			modalDots.innerHTML = '';
			images.forEach((_, index) => {
				const dot = document.createElement('button');
				dot.className = 'modal-dot';
				dot.addEventListener('click', () => {
					currentImageIndex = index;
					updateModalImage();
					updateModalDots();
				});
				modalDots.appendChild(dot);
			});
		}

		// Update modal image
		function updateModalImage() {
			if (images[currentImageIndex]) {
				modalImage.src = images[currentImageIndex].src;
				modalImage.alt = images[currentImageIndex].alt;
			}
		}

		// Update modal dots
		function updateModalDots() {
			const dots = Array.from(modalDots.children);
			dots.forEach((dot, index) => {
				dot.classList.toggle('active', index === currentImageIndex);
			});
		}

		// Open modal
		function openModal(imageIndex) {
			currentImageIndex = imageIndex;
			updateModalImage();
			updateModalDots();
			imageModal.classList.add('active');
			document.body.style.overflow = 'hidden';
		}

		// Close modal
		function closeModal() {
			imageModal.classList.remove('active');
			document.body.style.overflow = '';
		}

		// Navigation functions
		function nextImage() {
			currentImageIndex = (currentImageIndex + 1) % images.length;
			updateModalImage();
			updateModalDots();
		}

		function prevImage() {
			currentImageIndex = (currentImageIndex - 1 + images.length) % images.length;
			updateModalImage();
			updateModalDots();
		}

		// Event listeners
		images.forEach((img, index) => {
			img.addEventListener('dblclick', () => {
				openModal(index);
			});
		});

		if (modalClose) {
			modalClose.addEventListener('click', closeModal);
		}

		if (modalNext) {
			modalNext.addEventListener('click', nextImage);
		}

		if (modalPrev) {
			modalPrev.addEventListener('click', prevImage);
		}

		// Close modal on background click
		imageModal.addEventListener('click', (e) => {
			if (e.target === imageModal) {
				closeModal();
			}
		});

		// Keyboard navigation
		document.addEventListener('keydown', (e) => {
			if (imageModal.classList.contains('active')) {
				switch (e.key) {
					case 'Escape':
						closeModal();
						break;
					case 'ArrowLeft':
						prevImage();
						break;
					case 'ArrowRight':
						nextImage();
						break;
				}
			}
		});

		// Initialize modal dots
		createModalDots();



	}



});

document.addEventListener("DOMContentLoaded", function () {
	const observer = new window.IntersectionObserver((entries, obs) => {
		entries.forEach(entry => {
			if (entry.isIntersecting) {
				const el = entry.target;

				const effect = el.dataset.animate || "animate__fadeIn";
				el.classList.add("animate__animated", effect);
				el.style.opacity = 1;
				obs.unobserve(el);
			}
		});
	}, { threshold: 0.16 });
	document.querySelectorAll('.animate-on-scroll').forEach(el => {
		observer.observe(el);
	});

});
document.addEventListener("DOMContentLoaded", function () {
	const leftElements = document.querySelectorAll('#brands .animate-on-scroll .effect-left');
	const rightElements = document.querySelectorAll('#brands .animate-on-scroll .effect-right');
	const observer = new IntersectionObserver(entries => {
		entries.forEach(entry => {
			if (entry.isIntersecting) {
				entry.target.classList.add('animate__animated');
				if (entry.target.classList.contains('effect-left')) entry.target.classList.add('animate__fadeInLeft');
				if (entry.target.classList.contains('effect-right')) entry.target.classList.add('animate__fadeInRight');
				entry.target.style.opacity = "1";
				// Trigger custom .japan-fade-slide-in and .japan-bottom-rise
				if (entry.target.classList.contains('japan-fade-slide-in')) entry.target.style.animationPlayState = 'running';
				if (entry.target.classList.contains('japan-bottom-rise')) entry.target.style.animationPlayState = 'running';
			} else if (entry.intersectionRatio < 0.15) {
				// Optionally revert
			}
		});
	}, { threshold: 0.3 });
	leftElements.forEach(el => {
		observer.observe(el);
	});
	rightElements.forEach(el => {
		observer.observe(el);
	});
});

// Scroll animation via IntersectionObserver - perfect and smooth
document.addEventListener("DOMContentLoaded", function () {
	const els = document.querySelectorAll("#Instagram .scroll-animate-fadeup");
	const options = {
		root: null,
		threshold: 0.18
	};
	const reveal = (entries, observer) => {
		entries.forEach((entry, idx) => {
			if (entry.isIntersecting) {
				// Set animation delay from the inline style if specified
				const el = entry.target;
				if (el.style.animationDelay) {
					el.style.animationDelay = el.style.animationDelay;
				}
				el.classList.add("animated");
				observer.unobserve(el);
			}
		});
	};
	const observer = new IntersectionObserver(reveal, options);
	els.forEach(el => observer.observe(el));
});





// Full-featured slider with working prev/next buttons and dots
(function () {
	const sliderTrack = document.getElementById('sliderTrack');
	if (!sliderTrack) return;
	if (window.__fadeSliderActive) return; // skip transform slider when fade-only is active
	const slides = sliderTrack.children;
	const totalSlides = slides.length;

	// Find navigation buttons and dots
	const prevBtn = document.getElementById('slidePrev');
	const nextBtn = document.getElementById('slideNext');
	
	// Function to get dots dynamically (they may be created after this code runs)
	function getDotButtons() {
		return Array.from(document.querySelectorAll('.slider-dot'));
	}

	let currentSlide = 0;
	let isDragging = false;
	let pointerStartX = null;
	let dragStartCurrentSlide = 0;
	let touchId = null;

	function goToSlide(idx, updateDot = true) {
		const boundedIdx = Math.max(0, Math.min(totalSlides - 1, idx));
		currentSlide = boundedIdx;
		sliderTrack.style.transform = `translateX(${-100 * currentSlide}%)`;
		if (updateDot) updateDots();
	}

	function updateDots() {
		const dotButtons = getDotButtons(); // Get dots dynamically each time
		if (!dotButtons.length) return;
		dotButtons.forEach((dot, idx) => {
			if (idx === currentSlide) {
				dot.classList.add('active');
				dot.style.backgroundColor = '#3b82f6'; // Use same color as first slider
				dot.style.opacity = "1";
				dot.classList.remove('inactive-dot');
				dot.classList.add('active-dot');
			} else {
				dot.classList.remove('active');
				dot.classList.remove('active-dot');
				dot.classList.add('inactive-dot');
				dot.style.backgroundColor = '#d1d5db'; // Use same color as first slider
				dot.style.opacity = "0.7";
			}
		});
	}

	// Note: Button handlers are handled by the first slider implementation
	// We only handle drag/swipe here. Dots will be updated via transitionend listener

	// Dot click - use dynamic dot retrieval with event delegation
	const dotsContainer = document.querySelector('.slider-dots-container');
	if (dotsContainer) {
		dotsContainer.addEventListener('click', function (e) {
			const dot = e.target.closest('.slider-dot');
			if (dot) {
				const idx = parseInt(dot.getAttribute('data-index'), 10);
				if (!isNaN(idx)) {
					goToSlide(idx);
				}
			}
		});
	}

	// Touch/mouse drag/swipe enhanced: update dots correctly
	function getEventX(event) {
		if (event.touches && event.touches.length) return event.touches[0].clientX;
		if (event.changedTouches && event.changedTouches.length) return event.changedTouches[0].clientX;
		return event.clientX;
	}

	function onPointerDown(e) {
		isDragging = true;
		pointerStartX = getEventX(e);
		dragStartCurrentSlide = currentSlide;
		// Change cursor to grabbing and add dragging class
		sliderTrack.style.cursor = 'grabbing';
		sliderTrack.classList.add('dragging');
		document.body.style.cursor = 'grabbing';
		// Prevent text selection during drag
		e.preventDefault();
		// Touch identifier guard
		if (e.touches && e.touches.length) touchId = e.touches[0].identifier;
	}
	function onPointerMove(e) {
		// Update cursor during drag
		if (isDragging) {
			sliderTrack.style.cursor = 'grabbing';
			document.body.style.cursor = 'grabbing';
		}
	}
	function onPointerUp(e) {
		if (!isDragging) return;
		const endX = getEventX(e);
		const dx = endX - pointerStartX;
		if (Math.abs(dx) > 40) {
			if (dx < 0) {
				if (currentSlide < totalSlides - 1) {
					currentSlide += 1;
				}
			} else {
				if (currentSlide > 0) {
					currentSlide -= 1;
				}
			}
		}
		// Always update dots to reflect real slide
		goToSlide(currentSlide, true);
		isDragging = false;
		touchId = null;
		// Reset cursor and remove dragging class
		sliderTrack.style.cursor = 'grab';
		sliderTrack.classList.remove('dragging');
		document.body.style.cursor = '';
	}

	sliderTrack.addEventListener('mousedown', onPointerDown);
	window.addEventListener('mousemove', onPointerMove);
	window.addEventListener('mouseup', onPointerUp);
	
	// Handle mouse leave during drag
	sliderTrack.addEventListener('mouseleave', function(e) {
		if (isDragging) {
			// Trigger pointer up when mouse leaves while dragging
			onPointerUp(e);
		}
	});

	sliderTrack.addEventListener('touchstart', onPointerDown, { passive: true });
	sliderTrack.addEventListener('touchmove', onPointerMove, { passive: true });
	sliderTrack.addEventListener('touchend', onPointerUp);

	// Prevent drag image
	Array.from(sliderTrack.querySelectorAll('img')).forEach(img => {
		img.addEventListener('dragstart', (e) => e.preventDefault());
	});

	// Initialize - wait for dots to be created by first slider
	function initializeSlider() {
		const dotButtons = getDotButtons();
		if (dotButtons.length === 0) {
			// Dots not ready yet, try again
			setTimeout(initializeSlider, 100);
			return;
		}
		goToSlide(0);
	}
	
	// Start initialization
	setTimeout(initializeSlider, 200);
	
	// Function to sync currentSlide from transform
	function syncSlideFromTransform() {
		const transform = window.getComputedStyle(sliderTrack).transform;
		if (transform === 'none' || !transform) {
			currentSlide = 0;
		} else {
			const matrix = new DOMMatrix(transform);
			const translateX = matrix.m41 || 0;
			// The transform is translateX(-100% * slideIndex)
			// Since each slide is 100% of container width, translateX = -containerWidth * slideIndex
			const containerWidth = sliderTrack.offsetWidth;
			if (containerWidth > 0) {
				const calculatedSlide = Math.round(Math.abs(translateX) / containerWidth);
				if (calculatedSlide >= 0 && calculatedSlide < totalSlides) {
					currentSlide = calculatedSlide;
				}
			}
		}
		return currentSlide;
	}

	// Sync currentSlide from transform and update dots when transition ends
	// This ensures dots are correct after button clicks or swipes
	sliderTrack.addEventListener('transitionend', function(e) {
		// Only process transitionend for transform property
		if (e.propertyName !== 'transform') return;
		
		// Sync slide and update dots
		syncSlideFromTransform();
		updateDots();
	});
	
	// Sync after button clicks - listen to button clicks and update dots after animation
	// Use requestAnimationFrame to check transform after first slider updates
	if (prevBtn) {
		prevBtn.addEventListener('click', function() {
			// Use multiple checkpoints to ensure we catch the update
			requestAnimationFrame(function() {
				requestAnimationFrame(function() {
					syncSlideFromTransform();
					updateDots();
				});
			});
			// Also sync after transition completes
			setTimeout(function() {
				syncSlideFromTransform();
				updateDots();
			}, 1350);
		});
	}
	if (nextBtn) {
		nextBtn.addEventListener('click', function() {
			// Use multiple checkpoints to ensure we catch the update
			requestAnimationFrame(function() {
				requestAnimationFrame(function() {
					syncSlideFromTransform();
					updateDots();
				});
			});
			// Also sync after transition completes
			setTimeout(function() {
				syncSlideFromTransform();
				updateDots();
			}, 1350);
		});
	}

})();


// Swipe-to-scroll for the product slider: desktop mouse/touch
(function () {
	const slider = document.getElementById('swipeProductSlider');
	let isDown = false;
	let startX, scrollLeft, grabbed, lastDelta = 0;
	let lastMove = 0;
	let lastMoveTime = 0; // timestamp (ms)
	let velocity = 0; // px/ms
	let momentumId = null;
	const FRICTION = 0.94; // per frame (~60fps)
	const MIN_VELOCITY = 0.05; // px/ms threshold to stop

	// Use a wrapper if overflow hidden is on outer container
	if(!slider) return;
	const parent = slider.parentElement;
	slider.style.transition = "none";

	slider.addEventListener('mousedown', (e) => {
		isDown = true;
		grabbed = true;
		startX = e.pageX - slider.offsetLeft;
		lastMove = e.pageX;
		lastMoveTime = performance.now();
		velocity = 0;
		if (momentumId) {
			cancelAnimationFrame(momentumId);
			momentumId = null;
		}
		slider.style.cursor = 'grabbing';
	});
	document.addEventListener('mouseup', () => {
		if (!isDown) return;
		isDown = false;
		slider.style.cursor = '';
		startMomentum();
	});
	slider.addEventListener('mouseleave', () => {
		if (!isDown) return;
		isDown = false;
		slider.style.cursor = '';
		startMomentum();
	});
	slider.addEventListener('mousemove', (e) => {
		if (!isDown) return;
		e.preventDefault();
		const x = e.pageX - slider.offsetLeft;
		const now = performance.now();
		const delta = e.pageX - lastMove;
		const dt = Math.max(1, now - lastMoveTime);
		lastMove = e.pageX;
		lastMoveTime = now;

		// Move the slider left/right by adjusting its transform
		const currentTransform = getComputedStyle(slider).transform;
		let matrix = currentTransform === "none" ? [1, 0, 0, 1, 0, 0] : currentTransform.match(/matrix.*\((.+)\)/)[1].split(', ');
		let translateX = parseFloat(matrix[4] || 0);

		const newX = translateX + delta;
		slider.style.transform = `translateX(${newX}px)`;

		// Loop for seamless infinite effect
		const sliderWidth = slider.scrollWidth;
		const containerWidth = parent.clientWidth;
		const maxTranslate = 0;
		const minTranslate = containerWidth - sliderWidth;

		// When swiped far left or right, reset for infinite effect
		if (newX > maxTranslate + 1) { // Swipe too much right
			slider.style.transform = `translateX(${minTranslate}px)`;
		} else if (newX < minTranslate - 1) { // Swipe too much left
			slider.style.transform = `translateX(${maxTranslate}px)`;
		}

		// Update velocity (px/ms)
		velocity = delta / dt;
	});

	// Touch Events for mobile
	let touchStartX = null;
	let lastTouchMove = 0;
	slider.addEventListener('touchstart', function (e) {
		isDown = true;
		touchStartX = e.touches[0].pageX;
		lastTouchMove = touchStartX;
		lastMoveTime = performance.now();
		velocity = 0;
		if (momentumId) {
			cancelAnimationFrame(momentumId);
			momentumId = null;
		}
		slider.style.cursor = 'grabbing';
	});
	slider.addEventListener('touchend', function (e) {
		if (!isDown) return;
		isDown = false;
		touchStartX = null;
		slider.style.cursor = '';
		startMomentum();
	});
	slider.addEventListener('touchmove', function (e) {
		if (!isDown || touchStartX === null) return;
		const moveX = e.touches[0].pageX;
		const now = performance.now();
		const delta = moveX - lastTouchMove;
		const dt = Math.max(1, now - lastMoveTime);
		lastTouchMove = moveX;
		lastMoveTime = now;

		const currentTransform = getComputedStyle(slider).transform;
		let matrix = currentTransform === "none" ? [1, 0, 0, 1, 0, 0] : currentTransform.match(/matrix.*\((.+)\)/)[1].split(', ');
		let translateX = parseFloat(matrix[4] || 0);

		const newX = translateX + delta;
		slider.style.transform = `translateX(${newX}px)`;

		const sliderWidth = slider.scrollWidth;
		const containerWidth = parent.clientWidth;
		const maxTranslate = 0;
		const minTranslate = containerWidth - sliderWidth;

		if (newX > maxTranslate + 1) {
			slider.style.transform = `translateX(${minTranslate}px)`;
		} else if (newX < minTranslate - 1) {
			slider.style.transform = `translateX(${maxTranslate}px)`;
		}

		// Update velocity (px/ms)
		velocity = delta / dt;
	});

	function startMomentum() {
		let v = velocity * 16.67; // px/frame (~60fps)
		if (Math.abs(v) < MIN_VELOCITY * 16.67) return;
		const step = () => {
			const currentTransform = getComputedStyle(slider).transform;
			let matrix = currentTransform === "none" ? [1, 0, 0, 1, 0, 0] : currentTransform.match(/matrix.*\((.+)\)/)[1].split(', ');
			let translateX = parseFloat(matrix[4] || 0);
			let newX = translateX + v;
			slider.style.transform = `translateX(${newX}px)`;
			const sliderWidth = slider.scrollWidth;
			const containerWidth = parent.clientWidth;
			const maxTranslate = 0;
			const minTranslate = containerWidth - sliderWidth;
			if (newX > maxTranslate + 1) {
				slider.style.transform = `translateX(${minTranslate}px)`;
				newX = minTranslate;
			} else if (newX < minTranslate - 1) {
				slider.style.transform = `translateX(${maxTranslate}px)`;
				newX = maxTranslate;
			}
			v *= FRICTION;
			if (Math.abs(v) < MIN_VELOCITY * 16.67) {
				momentumId = null;
				return;
			}
			momentumId = requestAnimationFrame(step);
		};
		momentumId = requestAnimationFrame(step);
	}
})();


