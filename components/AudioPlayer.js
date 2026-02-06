import { useEffect, useRef, useState } from "react";

/**
 * Format seconds to MM:SS
 * @param {number} seconds
 * @returns {string}
 */
function formatTime(seconds) {
	if (!seconds || Number.isNaN(seconds)) return "0:00";
	const mins = Math.floor(seconds / 60);
	const secs = Math.floor(seconds % 60);
	return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Generate pseudo-random heights for waveform bars based on seed
 * @param {number} count - Number of bars
 * @param {number} seed - Seed for randomization
 * @returns {number[]} - Array of heights (0-1)
 */
function generateWaveformHeights(count, seed = 42) {
	const heights = [];
	let value = seed;
	for (let i = 0; i < count; i++) {
		// Simple pseudo-random number generator
		value = (value * 9301 + 49297) % 233280;
		const random = value / 233280;
		// Create varied heights that look like audio waveform
		heights.push(0.3 + random * 0.7);
	}
	return heights;
}

export default function AudioPlayer({ audioUrl, audioDuration }) {
	const audioRef = useRef(null);
	const [isPlaying, setIsPlaying] = useState(false);
	const [currentTime, setCurrentTime] = useState(0);
	const [duration, setDuration] = useState(audioDuration || 0);
	const [, setIsLoaded] = useState(false);

	// Number of bars in the waveform
	const barCount = 60;
	const waveformHeights = generateWaveformHeights(barCount);

	useEffect(() => {
		const audio = audioRef.current;
		if (!audio) return;

		const handleLoadedMetadata = () => {
			setDuration(audio.duration || audioDuration || 0);
			setIsLoaded(true);
		};

		const handleTimeUpdate = () => {
			setCurrentTime(audio.currentTime);
		};

		const handleEnded = () => {
			setIsPlaying(false);
			setCurrentTime(0);
		};

		const handlePlay = () => setIsPlaying(true);
		const handlePause = () => setIsPlaying(false);

		audio.addEventListener("loadedmetadata", handleLoadedMetadata);
		audio.addEventListener("timeupdate", handleTimeUpdate);
		audio.addEventListener("ended", handleEnded);
		audio.addEventListener("play", handlePlay);
		audio.addEventListener("pause", handlePause);

		return () => {
			audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
			audio.removeEventListener("timeupdate", handleTimeUpdate);
			audio.removeEventListener("ended", handleEnded);
			audio.removeEventListener("play", handlePlay);
			audio.removeEventListener("pause", handlePause);
		};
	}, [audioDuration]);

	const togglePlayPause = () => {
		const audio = audioRef.current;
		if (!audio) return;

		if (isPlaying) {
			audio.pause();
		} else {
			audio.play();
		}
	};

	const handleProgressClick = (e) => {
		const audio = audioRef.current;
		if (!audio || !duration) return;

		const rect = e.currentTarget.getBoundingClientRect();
		const clickX = e.clientX - rect.left;
		const percentage = clickX / rect.width;
		const newTime = percentage * duration;

		audio.currentTime = newTime;
		setCurrentTime(newTime);
	};

	const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

	return (
		<div className="my-6 p-4 bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
			{/* eslint-disable-next-line jsx-a11y/media-has-caption -- Audio player for TTS, no captions needed */}
			<audio ref={audioRef} src={audioUrl} preload="metadata" />

			<div className="text-sm text-gray-500 mb-3">
				Přečti si článek v podání Luďka Hlasomíra
			</div>

			<div className="flex items-center gap-3">
				{/* Play/Pause Button */}
				<button
					type="button"
					onClick={togglePlayPause}
					className="w-10 h-10 flex items-center justify-center bg-gray-900 hover:bg-gray-700 text-white rounded-full transition-colors flex-shrink-0"
					aria-label={isPlaying ? "Pause" : "Play"}
				>
					{isPlaying ? (
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 24 24"
							fill="currentColor"
							className="w-5 h-5"
							aria-hidden="true"
						>
							<path
								fillRule="evenodd"
								d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z"
								clipRule="evenodd"
							/>
						</svg>
					) : (
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 24 24"
							fill="currentColor"
							className="w-5 h-5 ml-0.5"
							aria-hidden="true"
						>
							<path
								fillRule="evenodd"
								d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z"
								clipRule="evenodd"
							/>
						</svg>
					)}
				</button>

				{/* Waveform Progress Bar */}
				<div
					role="slider"
					tabIndex={0}
					aria-label="Audio progress"
					aria-valuenow={Math.round(progress)}
					aria-valuemin={0}
					aria-valuemax={100}
					className="flex-1 min-w-0 h-10 flex items-center gap-0.5 cursor-pointer overflow-hidden"
					onClick={handleProgressClick}
					onKeyDown={(e) => {
						const audio = audioRef.current;
						if (!audio || !duration) return;
						if (e.key === "ArrowRight") {
							audio.currentTime = Math.min(audio.currentTime + 5, duration);
						} else if (e.key === "ArrowLeft") {
							audio.currentTime = Math.max(audio.currentTime - 5, 0);
						}
					}}
				>
					{waveformHeights.map((height, index) => {
						const barProgress = ((index + 1) / barCount) * 100;
						const isActive = barProgress <= progress;

						return (
							<div
								key={`bar-${index}`}
								className={`flex-1 min-w-[2px] max-w-[6px] rounded-full transition-colors ${
									isActive ? "bg-gray-900" : "bg-gray-300"
								}`}
								style={{ height: `${height * 100}%` }}
							/>
						);
					})}
				</div>

				{/* Time Display */}
				<div className="text-sm text-gray-500 tabular-nums flex-shrink-0 min-w-[80px] text-right">
					{formatTime(currentTime)} / {formatTime(duration)}
				</div>
			</div>
		</div>
	);
}
