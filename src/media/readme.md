# WebRTC Signalling

WebRTC signalling server for voice and video

1. Client requests voice token from host instance
    - For local users, this is just a POST request
    - For remote users, this is an activity to the voice channel inbox
2. Client identifies with signalling server of instance that owns VC
    - Provides above token, webrtc offer and candidates
3. Signalling sends answer and call can begin.

Notes:

-   All channels are callable, which should simplify database and code as there is no distinction between 'voice channels' and text channels
