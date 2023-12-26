import React, { useState, useEffect, useRef } from 'react';
import AvatarEditor from 'react-avatar-editor';
import Modal from 'react-modal';
import * as faceapi from 'face-api.js';

const modalStyles = {
    content: {
        width: '500px',
        height: '500px',
        marginLeft: '50%',
        marginTop: '20%',
        transform: 'translate(-50%, -30%)',
        inset: 0,
    },
    overlay: {
        background: 'rgb(0,0,0,0.5)',
    },
};

const PhotoEditor = () => {
    const [uploadedImage, setUploadedImage] = useState(null);
    const [editor, setEditor] = useState(null);
    const [scale, setScale] = useState(1.2);
    const [savedImageUrl, setSavedImageUrl] = useState(null);
    const [openModal, setOpenModal] = useState(false);
    const [facesDetected, setFacesDetected] = useState([]);
    const [isModelLoaded, setIsModelLoaded] = useState(false);

    const [message, setMessage] = useState('');
    const [rmessage, setRMessage] = useState('');

    const canvasRef = useRef();

    const onFileChange = (event) => {
        const file = event.target.files[0];
        setUploadedImage(file);
    };

    const handleScaleChange = (event) => {
        setScale(parseFloat(event.target.value));
    };

    const handleSave = () => {
        if (editor) {
            const canvas = editor.getImageScaledToCanvas();
            const dataURL = canvas.toDataURL();
            setSavedImageUrl(dataURL);
            detectFaces(dataURL);
        }

        setOpenModal(false);
    };

    const detectFaces = async (imageDataURL) => {
        setMessage('Processing the Photo ...')
        setRMessage('');

        if (!isModelLoaded) {
            await loadModels();
        }

        const image = new Image();
        image.src = imageDataURL;

        await new Promise((resolve) => {
            image.onload = resolve;
        });

        const detections = await faceapi.detectAllFaces(image);

        const canvas = canvasRef.current;

        // Check if the canvas is available before accessing its context and properties
        if (!canvas || !canvas.width || !canvas.height) {
            console.error('Canvas or its properties are not available');
            return;
        }

        const ctx = canvas.getContext('2d');

        // Check if the context is available before drawing on it
        if (!ctx) {
            console.error('Canvas context is not available');
            return;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (detections.length === 0) {
            // ctx.font = '20px Arial';
            // ctx.fillStyle = 'red';
            // ctx.fillText('No face detected', 10, 30);

            setMessage("No faces detected");
        } else if (detections.length === 1) {
            const resizedDetections = faceapi.resizeResults(detections, { width: canvas.width, height: canvas.height });

            // console.log('============resize dets landmarks', resizedDetections[0].landmarks);
            // faceapi.draw.drawDetections(canvas, resizedDetections);

            // const noseLandmark = resizedDetections[0].landmarks.getNose()[7];

            // if (Math.abs(noseLandmark.x - canvas.width / 2) > 20 || Math.abs(noseLandmark.y - canvas.height / 2) > 20) {
            //   ctx.fillStyle = 'red';
            //   ctx.font = '30px Arial';
            //   ctx.fillText('Please adjust the image to center the face', 10, 60);
            // }


            //check positio ============================================
            const face = resizedDetections[0];
            const faceCenterX = face._box.x + face._box.width / 2;
            const faceCenterY = face._box.y + face._box.height / 2;

            const canvasCenterX = canvas.width / 2;
            const canvasCenterY = canvas.height / 2;

            const tolerance = 10; // Adjust the tolerance as needed

            if (Math.abs(faceCenterX - canvasCenterX) <= tolerance && Math.abs(faceCenterY - canvasCenterY) <= tolerance) {
                console.log('Face is exactly at the center.');
                setMessage('Face is exactly at the center.');
            } else {
                console.log('Face is not centered.');
                setMessage('Face is not centered.');
            }



            // Define your acceptable size range====================
            const faceWidth = face._box.width;
            const minFaceSize = 100;
            const maxFaceSize = 150;

            if (faceWidth >= minFaceSize && faceWidth <= maxFaceSize) {
                console.log('Face size is within the acceptable range.');
                setRMessage('Face size is within the acceptable range.');
            } else {
                console.log('Face size is not within the acceptable range.');
                setRMessage('Face size is not within the acceptable range.');
            }
        } else {
            console.log('More than one face detected.');
            setMessage('More than one face detected.');
        }
    };



    const loadModels = async () => {
        await faceapi.nets.ssdMobilenetv1.loadFromUri('/models');
        await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
        await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
        await faceapi.nets.faceRecognitionNet.loadFromUri("/models");

        setIsModelLoaded(true);
    };

    const handleAdjustment = async () => {
        if (editor) {
            const canvas = editor.getImageScaledToCanvas();
            const dataURL = canvas.toDataURL();
            setSavedImageUrl(dataURL);
            detectFaces(dataURL);
        }
    };


    const handleImageChange = () => {
        setTimeout(() => {
            handleAdjustment();
        }, 100);
    }

    useEffect(() => {
        if (uploadedImage) {
            detectFaces(URL.createObjectURL(uploadedImage));
        }
    }, [uploadedImage, isModelLoaded]);


    return (
        <div>
            <Modal
                isOpen={openModal}
                onRequestClose={() => setOpenModal(false)}
                style={modalStyles}
                contentLabel="Example Modal"
            >
                <input type="file" onChange={onFileChange} accept="image/*" onClick={() => setOpenModal(true)} />

                {uploadedImage && (
                    <div>
                        <AvatarEditor
                            ref={(editorRef) => setEditor(editorRef)}
                            image={uploadedImage}
                            width={310}
                            height={310}
                            border={20}
                            scale={scale}
                            onImageReady={handleAdjustment}
                            onImageChange={handleImageChange}
                            onClick={() => console.log('=====================clicked on avatar')}
                        />
                        <label>Adjust Zoom:</label>
                        <input
                            type="range"
                            min="1"
                            max="2"
                            step="0.01"
                            value={scale}
                            onChange={handleScaleChange}
                        />
                        <br />
                        <button type="button" onClick={handleSave}>
                            Save
                        </button>
                    </div>
                )}

                {!uploadedImage && <h3>Please Upload a Photo</h3>}

                {/* Conditionally render the canvas only when the Modal is open */}
                {openModal && uploadedImage && (
                    <canvas
                        ref={canvasRef}
                        width={250}
                        height={250}
                        style={{ position: 'absolute', top: 93, left: 70, zIndex: 2, border: '2px dotted blue', pointerEvents: "none", borderRadius: "50%" }}
                        onClick={() => console.log('===========clicked on canvas')}
                    />
                )}

                {message && <p>{message}</p>}
                {rmessage && <p>{rmessage}</p>}
            </Modal>

            <div>
                <h2>Saved Image</h2>
                {savedImageUrl ? (
                    <>
                        <img src={savedImageUrl} alt="Saved Profile" style={{ maxWidth: '100%' }} />
                        {facesDetected.length > 0 && (
                            <p>{`${facesDetected.length} face(s) detected.`}</p>
                        )}
                    </>
                ) : (
                    <p>No image saved yet.</p>
                )}
            </div>
            <button onClick={() => setOpenModal(true)}>Upload profile</button>
        </div>
    );
};

export default PhotoEditor;