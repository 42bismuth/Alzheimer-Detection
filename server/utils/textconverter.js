import { config as dotenvConfig } from 'dotenv';
import { AssemblyAI } from 'assemblyai'

dotenvConfig()

const client = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_KEY
})

// adjust path to your local test audios
const audioUrl = './testaudios/test102.mp3'


async function getTranscripts(audioUrl) {
  const audioConfig = {
    audio_url: audioUrl
  };

  try {
    const transcript = await client.transcripts.create(audioConfig);
    // console.log(transcript.text);
    // console.log(transcript)
    return transcript;
  } catch (error) {
    console.error('Error fetching transcripts:', error);
    throw error;
  }
}

export { getTranscripts };
