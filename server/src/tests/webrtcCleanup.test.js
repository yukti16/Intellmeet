const test = require('node:test');
const assert = require('node:assert');
const { cleanupMediaAndPeers } = require('../utils/webrtcCleanup');

test('WebRTC Cleanup - Stops all local audio and video MediaStreamTracks', () => {
  let audioStopped = false;
  let videoStopped = false;

  const mockAudioTrack = {
    kind: 'audio',
    stop: () => { audioStopped = true; },
  };

  const mockVideoTrack = {
    kind: 'video',
    stop: () => { videoStopped = true; },
  };

  const mockLocalStream = {
    getTracks: () => [mockAudioTrack, mockVideoTrack],
  };

  cleanupMediaAndPeers({
    localStream: mockLocalStream,
  });

  assert.strictEqual(audioStopped, true, 'Local audio track must be stopped');
  assert.strictEqual(videoStopped, true, 'Local video track must be stopped');
});

test('WebRTC Cleanup - Stops dedicated camera track reference', () => {
  let cameraStopped = false;
  const mockCameraTrack = {
    kind: 'video',
    stop: () => { cameraStopped = true; },
  };

  cleanupMediaAndPeers({
    cameraTrack: mockCameraTrack,
  });

  assert.strictEqual(cameraStopped, true, 'Dedicated camera track ref must be stopped');
});

test('WebRTC Cleanup - Stops active screen-sharing tracks', () => {
  let screenStopped = false;
  const mockScreenTrack = {
    kind: 'video',
    stop: () => { screenStopped = true; },
  };

  const mockScreenStream = {
    getTracks: () => [mockScreenTrack],
  };

  cleanupMediaAndPeers({
    screenStream: mockScreenStream,
  });

  assert.strictEqual(screenStopped, true, 'Screen sharing track must be stopped');
});

test('WebRTC Cleanup - Closes all RTCPeerConnection instances and detaches handlers', () => {
  let pc1Closed = false;
  let pc2Closed = false;

  const mockPc1 = {
    ontrack: () => {},
    onicecandidate: () => {},
    close: () => { pc1Closed = true; },
  };

  const mockPc2 = {
    ontrack: () => {},
    onicecandidate: () => {},
    close: () => { pc2Closed = true; },
  };

  cleanupMediaAndPeers({
    peerConnections: {
      socket_peer_1: mockPc1,
      socket_peer_2: mockPc2,
    },
  });

  assert.strictEqual(pc1Closed, true, 'PeerConnection 1 must be closed');
  assert.strictEqual(pc2Closed, true, 'PeerConnection 2 must be closed');
  assert.strictEqual(mockPc1.ontrack, null, 'ontrack handler must be null');
  assert.strictEqual(mockPc1.onicecandidate, null, 'onicecandidate handler must be null');
});

test('WebRTC Cleanup - Emits leave-meeting and removes socket listeners', () => {
  const emittedEvents = [];
  const removedEvents = [];

  const mockSocket = {
    emit: (event) => { emittedEvents.push(event); },
    off: (event) => { removedEvents.push(event); },
  };

  cleanupMediaAndPeers({
    socket: mockSocket,
  });

  assert.ok(emittedEvents.includes('leave-meeting'), 'Must emit leave-meeting on exit');
  assert.ok(removedEvents.includes('existing-participants'), 'Must remove existing-participants listener');
  assert.ok(removedEvents.includes('user-joined'), 'Must remove user-joined listener');
  assert.ok(removedEvents.includes('meeting-ended-by-host'), 'Must remove meeting-ended-by-host listener');
});

test('WebRTC Cleanup - Releases video element srcObject references', () => {
  const mockVideoEl = { srcObject: { id: 'stream-123' } };

  cleanupMediaAndPeers({
    videoElements: [mockVideoEl],
  });

  assert.strictEqual(mockVideoEl.srcObject, null, 'video srcObject must be released');
});

test('WebRTC Cleanup - Idempotent and resilient when called multiple times or with empty input', () => {
  assert.doesNotThrow(() => {
    cleanupMediaAndPeers();
    cleanupMediaAndPeers({});
    cleanupMediaAndPeers({ localStream: null, peerConnections: null, socket: null });
  });
});
