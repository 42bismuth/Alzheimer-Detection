/* eslint-disable no-unused-vars */
import MicRecorder from "mic-recorder-to-mp3";
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import AudioTimer from "./AudioTimer";
import axios from "axios";
import './RecorderStyles.css';

const PORT = process.env.REACT_APP_PORT;
const ASSEMBLY_API_KEY = process.env.REACT_APP_ASSEMBLYAI_KEY;

// Set AssemblyAI Axios Header
const assembly = axios.create({
    baseURL: "https://api.assemblyai.com/v2",
    headers: {
        authorization: ASSEMBLY_API_KEY,
        "content-type": "application/json",
    },
});

const App = () => {
    const navigate = useNavigate();
    const recorder = useRef(null); // Recorder
    const audioPlayer = useRef(null); // Ref for the HTML Audio
    const [elapsedTime, setElapsedTime] = useState(0);
    const [blobURL, setBlobUrl] = useState(null);
    const [audioFile, setAudioFile] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const [uploadURL, setUploadURL] = useState("");
    const [transcriptID, setTranscriptID] = useState("");
    const [transcriptData, setTranscriptData] = useState(null);
    const [transcript, setTranscript] = useState("");

    useEffect(() => {
        recorder.current = new MicRecorder({ bitRate: 128 });
    }, []);

    const startRecording = () => {
        setElapsedTime(0);
        setTranscript("");
        setTranscriptData(null);
        setTranscriptID("");
        recorder.current.start().then(() => {
            setIsRecording(true);
        });
    };

    const stopRecording = () => {
        recorder.current.stop().getMp3().then(([buffer, blob]) => {
            const file = new File(buffer, "audio.mp3", {
                type: blob.type,
                lastModified: Date.now(),
            });
            const newBlobUrl = URL.createObjectURL(blob);
            setBlobUrl(newBlobUrl);
            setIsRecording(false);
            setAudioFile(file);
        }).catch((e) => console.log(e));
        setElapsedTime(0)
    };

    const uploadAudioFile = async () => {
        if (audioFile) {
            try {
                const formData = new FormData();
                formData.append('file', audioFile);
                const res = await assembly.post("/upload", formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                setUploadURL(res.data.upload_url);
                return res.data.upload_url;
            } catch (err) {
                console.error(err);
            }
        }
        return null;
    };

    const submitTranscriptionHandler = async () => {
        setIsLoading(true);
        const uploadedURL = await uploadAudioFile();
        if (uploadedURL) {
            try {
                const res = await assembly.post("/transcript", { audio_url: uploadedURL });
                setTranscriptID(res.data.id);
                checkStatusHandler(res.data.id);
            } catch (err) {
                console.error(err);
                setIsLoading(false);
            }
        } else {
            window.alert('Error occurred while uploading your Audio. Please try recording again.');
            setIsLoading(false);
            setAudioFile(null);
        }
    };

    const checkStatusHandler = async (id) => {
        try {
            let status = "";
            while (status !== "completed") {
                const res = await assembly.get(`/transcript/${id}`);
                setTranscriptData(res.data);
                status = res.data.status;
                if (status === "completed") {
                    setTranscript(res.data.text);
                    predictHandler(res.data.text);
                    break;
                }
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        } catch (err) {
            console.error(err);
            setIsLoading(false);
        }
    };

    const predictHandler = async (transcriptText) => {
        if (transcriptText) {
            const requestData = { data: transcriptText };
            try {
                const response = await axios.post(`http://localhost:${PORT}/predict`, requestData, {
                    headers: { 'Content-Type': 'application/json' }
                });
                const result = response.data;
                if (result) {
                    console.log(requestData, result)
                }
                navigate('/result', { state: { result: result } });
            } catch (err) {
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        } else {
            window.alert('Input is empty, Please try recording again before submitting');
            setIsLoading(false);
            setAudioFile(null);
        }
    };

    return (
        <div className="recorder-container">
            <h2 className="title">"Record your audio"</h2>
            <AudioTimer isRunning={isRecording} elapsedTime={elapsedTime} setElapsedTime={setElapsedTime} />

            {!isRecording ?
                <div className="button-container">
                    <button onClick={startRecording} className="style-button">
                        START
                    </button>
                </div>
                :
                <div className="button-container">
                    <button onClick={stopRecording} className="style-button">
                        STOP
                    </button>
                </div>}

            {(audioFile && !transcript) && <audio ref={audioPlayer} src={blobURL} controls='controls' className="audio-element" />}

            {isLoading ?
                <div className="button-container">
                    <button className="style-button">Processing...</button>
                </div>
                : audioFile &&
                <div className="button-container">
                    <button onClick={submitTranscriptionHandler} className="style-button">SUBMIT</button>
                </div>}
            {transcriptData?.status === "completed" && <p>{transcript}</p>}
        </div>
    );
}

export default App;