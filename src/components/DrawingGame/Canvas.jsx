import './DrawingCanvas.css';
import { useEffect, useRef, useState } from 'react';
import "./canvas.css"
import io from 'socket.io-client';
const socket = io.connect("http://localhost:3001")
const Canvas = (props) => {
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [color, setColor] = useState(props.color);
  const [shouldClear, setShouldClear] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    function resizeCanvas() {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      context.lineCap = 'round';
    }

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    contextRef.current = context;
  }, []);

  useEffect(() => {
    setColor(props.color);
  }, [props.color]);
  
  useEffect(() => {
    socket.emit('setColor', color);
  }, [color]);

  useEffect(() => {
    contextRef.current.lineWidth = props.size;
  }, [props.size]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    context.strokeStyle = color;
  }, [color]);

  useEffect(() => {
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      context.clearRect(0, 0, canvas.width, canvas.height);
      setShouldClear(false);
    
  }, [props.clear]);
  
  const [points, setPoints] = useState([]);
  

  const startDrawing = ({ nativeEvent }) => {
    if (isLocked) {
      return;
    }
    const { offsetX, offsetY } = nativeEvent;
    contextRef.current.beginPath();
    contextRef.current.moveTo(offsetX, offsetY);
    setIsDrawing(true);
    setPoints([{ x: offsetX, y: offsetY }]);
    socket.emit('startDrawing', { x: offsetX, y: offsetY });
  };

  const draw = ({ nativeEvent }) => {
    if (!isDrawing) {
      return;
    }
  
    const { offsetX, offsetY } = nativeEvent;
    contextRef.current.lineTo(offsetX, offsetY);
    contextRef.current.stroke();
  
    // Add the new point to the list of points for the current drawing
    const newPoints = [...points, { x: offsetX, y: offsetY }];
    setPoints(newPoints);
  
    // Send the entire list of points for the current drawing, along with the current size, to the other player
    socket.emit('draw', { points: newPoints, size: props.size });
  };
  
  
  

  const stopDrawing = () => {
    contextRef.current.closePath();
    setIsDrawing(false);
  
    socket.emit('stopDrawing');
  };


  const saveImageToLocal = (event) => {
    let link = event.currentTarget;
    link.setAttribute('download', 'canvas.png');
    let image = canvasRef.current.toDataURL('image/png');
    link.setAttribute('href', image);
  };

  const clearCanvas = () => {
    setShouldClear(true);
  }
  useEffect(() => {
    socket.on('startDrawing', ({ x, y }) => {
      contextRef.current.beginPath();
      contextRef.current.moveTo(x, y);
    });
  
    socket.on('draw', ({ points, size }) => {
      contextRef.current.beginPath();
      contextRef.current.moveTo(points[0].x, points[0].y);
      contextRef.current.lineWidth = size; // Set the line width to the size sent from the other player
      points.forEach((point) => {
        contextRef.current.lineTo(point.x, point.y);
      });
      contextRef.current.stroke();
    });
    
  
    socket.on('stopDrawing', () => {
      contextRef.current.closePath();
    });
    socket.on('setColor', (color) => {
      contextRef.current.strokeStyle = color;
    });
  }, []);

  return (
    <div className="canvas-container">
      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing} 
        onMouseLeave={stopDrawing}
        style={{ width: '100%', height: '100%', borderRadius: '10px' }}
      ></canvas>
      <div>
        {/* <button onClick={setToDraw}>Draw</button>
        <button onClick={setToErase}>Erase</button>
        <button onClick={clearCanvas}>Clear</button>
        <a id="download_image_link" href="download_link" onClick={saveImageToLocal}>
          Download Image
        </a> */}
      </div>
    </div>
  );
};

export default Canvas;
