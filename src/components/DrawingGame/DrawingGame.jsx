import { useState, useContext, useEffect } from "react"
import Canvas from "./Canvas"
import { UserContext } from "../../App"
import "./canvas.css"
import { FaEraser, FaPaintBrush } from 'react-icons/fa'
import { GrClearOption } from "react-icons/gr"
import { RiBrushFill } from "react-icons/ri"
import { BiUser } from "react-icons/bi"
import { IoPlanetSharp } from "react-icons/io5"
import { MdOutlineContentCopy, MdDone, MdAccessTimeFilled, MdColorLens } from "react-icons/md"
import { AiOutlineLink } from "react-icons/ai"
import { FaCrown } from "react-icons/fa"
import AOS from "aos"
import 'aos/dist/aos.css';
import axios from "axios"
import io from "socket.io-client"
const socket = io.connect("http://localhost:3001")
const DrawingGame = () => {
    useEffect(() => {
        AOS.init();
    }, [])
    const [gameRound,setGameRoud] = useState(0);
    const [playRound,setPlayRound] = useState(2)
    const [correct,setCorrect] = useState(false);
    const [color, setColor] = useState("#000000");
    const [size, setSize] = useState(5);
    const [clear, setClear] = useState("");
    const [isJoin, setIsJoin] = useState(false);
    const [start, setStart] = useState(false);
    const [roomId, setRoomId] = useState("");
    const [playerNames, setPlayerNames] = useState([]);
    const [playerProfiles, setPlayerProfiles] = useState({});
    function generateRoomID() {
        const letters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const numbers = '0123456789';
        let result = '';
        for (let i = 0; i < 5; i++) {
            // pick a random letter
            result += letters.charAt(Math.floor(Math.random() * letters.length));
            // pick a random number
            result += numbers.charAt(Math.floor(Math.random() * numbers.length));
        }
        return result;
    }

    const handleColorChange = (newColor) => {
        setColor(newColor);
    }
    const { userData, logged, setLogged, setUserData, userId } = useContext(UserContext);
    const pencil_color_list = [
        "#000000", "#ffffff", "#017420", "#11b03c",
        "#b0701c", "#ffc126", "#666666", "#aaaaaa",
        "#990000", "#ff0013", "#99004e", "#ff008f",
        "#0050cd", "#26c9ff", "#964112", "#ff7829",
        "#cb5a57", "#feafa8", "#2B0C51", "#371761",
        "#663299", "#5746A6", "#5746A6", "#476CA9"
    ];
    const handleJoinRoom = () => {
        // Validate room ID format
        const regex = /^[0-9a-zA-Z]{10}$/;
        if (!regex.test(roomId)) {
            setPopupFade(true);
            setPopupText("รูปแบบไอดีห้องไม่ถูกต้อง");
            setPopupColor("text-red-600");
            return;
        }

        // Check if the room exists before joining
        socket.emit("checkRoom", roomId, (roomExists) => {
            if (roomExists) {
                socket.emit("join", roomId);
                // Emit an event to the server to inform that a new player has joined the room
                socket.emit("newPlayer", { roomId, playerName: userData.username, playerProfile: userData.userProfile });
                setIsJoin(true);
            } else {
                // Handle the case where the room doesn't exist
                setPopupFade(true);
                setPopupText("ไม่พบไอดีห้องนี้");
                setPopupColor("text-red-600");
                return;
            }
        });
    };

    const handleGenerateRoomID = () => {
        const newRoomId = generateRoomID();
        setRoomId(newRoomId);
        console.log("new roomId:", newRoomId);
        if (newRoomId) {
            socket.emit("join", newRoomId);
            // Emit an event to the server to inform that a new player has joined the room
            socket.emit("newPlayer", { roomId: newRoomId, playerName: userData.username, playerProfile: userData.userProfile });
            setIsJoin(true);
        }
    };
    const [quizData, setQuizData] = useState([]);
    const handleStartGame = () => {
        if (playerNames.length < 2) {
            setPopupFade(true);
            setPopupText("ต้องการผู้เล่นขั้นต่ำ 2 คน")
            setPopupColor("text-red-700");
        }
        if (playerNames.length >= 2 && playerNames[0] === userData.username) {
            axios
                .get('http://localhost:3005/quiz', {
                    params: {
                        n: (playerNames.length)
                    }
                })
                .then((response) => {
                    setQuizData(response.data);
                    socket.emit('quizData', { roomId: roomId, quizData: response.data });
                    setStart(true);
                    socket.emit('startGame', roomId);
                    socket.emit('sendStatus', {
                        roomId: roomId,
                        message: `🎨 ${playerNames[currentPlayer]} กำลังวาด`,
                    });
                    // Start the game here
                })
                .catch((error) => {
                    console.log(error);
                });
        } else {
            console.log('You do not have permission to start the game.');
        }
    };

    useEffect(() => {
        if (roomId) {
            socket.on("playerList", ({ playerNames, playerProfiles }) => {
                console.log(playerNames);
                console.log(playerProfiles)
                setPlayerProfiles(playerProfiles);
                setPlayerNames(playerNames);
                setTotalRounds(playerNames.length);
            });
        }
        socket.on("startGame", () => {
            setStart(true);
        });
        return () => {
            socket.off("playerList");
        };
    }, [roomId]);
    const TOTAL_ROUND_TIME = 10;
    const [copyLink, setCopyLink] = useState(false);
    const [totalRounds, setTotalRounds] = useState(0);
    const [currentRound, setCurrentRound] = useState(0);
    const [currentPlayer, setCurrentPlayer] = useState(0);
    const [roundTime, setRoundTime] = useState(TOTAL_ROUND_TIME); // in seconds
    const [timeLeft, setTimeLeft] = useState(roundTime);
    const resetGame = () => {
        setSize(5);
        setColor("#000000")
        setCopyLink(false);
        setTotalRounds(playerNames.length);
        setCurrentRound(0);
        setCurrentPlayer(0);
        setRoundTime(TOTAL_ROUND_TIME);
        setTimeLeft(TOTAL_ROUND_TIME);
    };
    const [waiting, setWaiting] = useState(false);
    useEffect(() => {
        let timerId;
        if (start && timeLeft > 0 && !waiting) {
            timerId = setInterval(() => {
                setTimeLeft((timeLeft) => timeLeft - 1);
            }, 1000);
        } else if (start && !waiting) {
            setTimeLeft(roundTime);
            if (currentPlayer === playerNames.length - 1 && currentRound === totalRounds - 1) {
                // End of the game
                setStart(false);
                resetGame();
            } else if (currentPlayer === playerNames.length - 1) {
                setWaiting(true);
                axios
                .get('http://localhost:3005/quiz', {
                    params: {
                        n: (playerNames.length)
                    }
                })
                .then((response) => {
                    setQuizData(response.data);
                    socket.emit('quizData', { roomId: roomId, quizData: response.data });
                })
                .catch((error) => {
                    console.log(error);
                });
                setTimeout(() => {
                    setRoundTime(TOTAL_ROUND_TIME);
                    setTimeLeft(TOTAL_ROUND_TIME);
                    setCurrentRound((currentRound) => currentRound + 1);
                    setCurrentPlayer(0);
                    setCorrect(false);
                    setClear(Date.now()); // clear canvas for the next round
                    setWaiting(false);
                    socket.emit('resetScore',{roomId:roomId});
                    socket.emit('sendStatus', {
                        roomId: roomId,
                        message: `🎨 ${playerNames[0]} กำลังวาดอยู่`,
                    });
                }, 5000); // wait for 5 seconds before starting the next round
            } else {
                setWaiting(true);
                setTimeout(() => {
                    setRoundTime(TOTAL_ROUND_TIME);
                    setTimeLeft(TOTAL_ROUND_TIME);
                    setCurrentPlayer((currentPlayer) => currentPlayer + 1);
                    setSize(5);
                    setColor("#000000");
                    setCorrect(false);
                    setClear(Date.now());
                    setWaiting(false);
                    socket.emit('resetScore',{roomId:roomId});
                    if(playerNames[currentPlayer+1]===userData.username){
                        socket.emit('sendStatus', {
                            roomId: roomId,
                            message: `🎨 ${playerNames[currentPlayer+1]} กำลังวาดอยู่`,
                        });
                    }
                }, 5000); // wait for 5 seconds before starting the next round
            }
        }

        return () => {
            clearInterval(timerId);
        };
    }, [start, timeLeft, currentPlayer, currentRound, totalRounds, roundTime, playerNames, waiting]);

    const barWidth = `${((timeLeft / roundTime) * 100)}%`;
    const [answer, setAnswer] = useState("");
    const dummyQuestionList = ["นีล อาร์มสตรอง", "ดาวเสาร์", "ดวงอาทิตย์"]
    const [correctPlayerAmount, setCorrectPlayerAmount] = useState(0);
    const handleKeyDown = (event) => {
        if (event.key === 'Enter') {
            const newAnswer = answer;
            setAnswer('');
            if (newAnswer === quizData[currentPlayer]) {
                const score = [100, 75, 50, 30];
                setCorrect(true);
                if (correctPlayerAmount === 0) {
                    socket.emit('sendStatus', { roomId: roomId, message: `✨ ${userData.username} ได้รับ ${score[0]} คะแนน` });
                    socket.emit('sendCorrectPlayerAmount', { roomId: roomId, amount: correctPlayerAmount + 1 });
                    socket.emit('newAnswer', { roomId: roomId, newAnswer: newAnswer, username: userData.username, isCorrect: true });
                    event.target.value = '';
                    return;
                }
                if (correctPlayerAmount === 1) {
                    socket.emit('sendStatus', { roomId: roomId, message: `✨ ${userData.username} ได้รับ ${score[1]} คะแนน` });
                    socket.emit('sendCorrectPlayerAmount', { roomId: roomId, amount: correctPlayerAmount + 1 });
                    socket.emit('newAnswer', { roomId: roomId, newAnswer: newAnswer, username: userData.username, isCorrect: true });
                    event.target.value = '';
                    return;
                }
                if (correctPlayerAmount === 2) {
                    socket.emit('sendStatus', { roomId: roomId, message: `✨ ${userData.username} ได้รับ ${score[2]} คะแนน` });
                    socket.emit('sendCorrectPlayerAmount', { roomId: roomId, amount: correctPlayerAmount + 1 });
                    socket.emit('newAnswer', { roomId: roomId, newAnswer: newAnswer, username: userData.username, isCorrect: true });
                    event.target.value = '';
                    return;
                }
                else {
                    socket.emit('sendStatus', { roomId: roomId, message: `✨ ${userData.username} ได้รับ ${score[3]} คะแนน` });
                    socket.emit('sendCorrectPlayerAmount', { roomId: roomId, amount: correctPlayerAmount + 1 });
                    socket.emit('newAnswer', { roomId: roomId, newAnswer: newAnswer, username: userData.username, isCorrect: true });
                    event.target.value = '';
                    return;
                }
            }
            else {
                socket.emit('newAnswer', { roomId: roomId, newAnswer: newAnswer, username: userData.username, isCorrect: false });
                event.target.value = '';
                return;
            }
        }
    };

    const [answerList, setAnswerList] = useState([]);
    useEffect(() => {
        socket.on('answer', (newAnswerData) => {
            setAnswerList(prevAnswerList => [...prevAnswerList, newAnswerData]);
        });
        socket.on("statusUpdate", (newStatus) => {
            setStatusList((prevStatusList) => [...prevStatusList, newStatus]);
        });
        socket.on("getQuizData", (quizData) => {
            setQuizData(quizData);
        })
        socket.on("updateCorrectPlayerAmount", (amount) => {
            setCorrectPlayerAmount(amount);
        })
        return () => {
            socket.off('answer');
            socket.off("statusUpdate");
            socket.off("updateCorrectPlayerAmount");
        };

    }, [socket]);

    const [popupFade, setPopupFade] = useState(false);
    const [popupText, setPopupText] = useState("");
    const [popupColor, setPopupColor] = useState("text-gray-400")
    useEffect(() => {
        if (popupFade) {
            setTimeout(() => {
                setPopupFade(false);
                setPopupText("");
                setPopupColor("text-gray-400");
            }, 2000);
        }
    }, [popupFade]);
    const [statusList, setStatusList] = useState([]);
    return (
        <>
            {popupFade && (
                <div className={`z-[200] font-ibm-thai ${popupColor} top-20 w-full text-center absolute`} id="popup-text">
                    <p>{popupText}</p>
                </div>)}
            <div className="w-full h-screen flex">
                {!isJoin && userData && (
                    <div className="w-full max-w-4xl h-full mx-auto p-4 relative">
                        <div className="grid grid-cols-2 bg-white border-2 mt-10 rounded-2xl pt-10 pb-16
                    drop-shadow-md">
                            <p className="col-span-2 mb-10 text-center mt-4 text-2xl">Drawing Game</p>
                            <div className="">
                                <p className="font-ibm-thai text-2xl font-bold text-center">ผู้เล่น</p>
                                <div className="w-1/3 h-fit mx-auto rounded-full p-1 mt-2 border-[3px] border-[#663299]">
                                    <img src={userData.userProfile} className="rounded-full mx-auto" />
                                </div>
                                <div className="w-full h-fit  flex mx-auto mt-6 px-4 justify-between">
                                    <div className="flex mx-auto">
                                        <BiUser className="my-auto mr-2 text-2xl" />
                                        <p className="font-ibm-thai my-auto text-lg">ชื่อผู้เล่น:</p>
                                        <p className="ml-2 font-golos text-xl text-purple-800 font-semibold opacity-80">{userData.username}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="px-4 border-l-2 border-gray-200 ">
                                <div className="w-full h-fit flex flex-col">
                                    <p className="text-lg font-golos">ID ห้อง</p>
                                    <div className="w-full h-full flex">
                                        <input type="text" name="roomId" id="roomId" value={roomId}
                                            onChange={(event) => setRoomId(event.target.value.substring(0, 10))}
                                            className={`border-[1.5px] rounded-md px-3 py-2 w-full h-12 text-violet-800 text-xl rounded-r-none
                                focus:outline-gray-300`} />
                                        <button className={`bg-gradient-to-r px-4
                                    from-[#6e3f92] to-[#a94fa4]
                                    hover:marker:from-[#754798] hover:to-[#a65ea3] text-white rounded-xl
                                    rounded-l-none ${!roomId ? "cursor-no-drop" : "cursor-pointer"}`}
                                            onClick={handleJoinRoom} disabled={!roomId}>เล่น</button>
                                    </div>
                                    <p className="text-lg font-ibm-thai mx-auto mt-6">หรือ</p>
                                    <button className="bg-gradient-to-r px-4 mx-[30%] py-3 mt-6
                                    from-[#6e3f92] to-[#a94fa4]
                                    hover:marker:from-[#754798] hover:to-[#a65ea3] text-white rounded-xl flex
                                    font-ibm-thai"><IoPlanetSharp className="text-xl my-auto" />
                                        <p className="ml-3" onClick={handleGenerateRoomID}>สร้างห้องใหม่</p></button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {isJoin && !start && (
                    <>
                        <div className="w-full max-w-4xl h-full mx-auto p-4 relative ">
                            <div className="flex w-fit mx-auto mt-6"
                                onClick={() => {
                                    navigator.clipboard.writeText(roomId);
                                    setCopyLink(true);
                                    setPopupFade(true);
                                    setPopupText("คัดลอกลิงก์เรียบร้อยแล้ว")
                                    setPopupColor("text-green-600");
                                }}
                                onMouseLeave={() => {
                                    setTimeout(() => {
                                        setCopyLink(false)
                                    }, 1000);
                                }}>
                                <p className="font-ibm-thai text-xl mt-[6px] mr-2">ห้อง: </p>
                                <p className="text-3xl font-golos font-bold text-violet-900 cursor-pointer">{roomId}</p>
                                {!copyLink ? <MdOutlineContentCopy className="ml-1 text-2xl my-auto cursor-pointer text-violet-900" />
                                    : <MdDone className="ml-1 text-2xl my-auto cursor-pointer text-green-500" />}
                            </div>
                            <p id="loading-text" className="font-ibm-thai font-bold text-xl text-center mt-4"
                            >กำลังรอผู้เล่นคนอื่น<span id="dot-animation"></span></p>
                            <p className="text-center">
                                {playerNames.length > 0 && playerNames[0] === userData.username &&
                                    (<button className="bg-gradient-to-r px-4 mx-auto py-3 mt-2
                                    from-[#6e3f92] to-[#a94fa4]
                                    hover:marker:from-[#754798] hover:to-[#a65ea3] text-white rounded-xl flex
                                    font-ibm-thai"><IoPlanetSharp className="text-xl my-auto" />
                                        <p className="ml-3 text-xl" onClick={handleStartGame}>เริ่มเกม</p></button>)}
                            </p>
                            <img src="/assets/drawing-game_page/animal group.png" id="animal_group_waiting"
                                className="w-3/4 auto top-45  absolute" />
                        </div>
                    </>)}
                {/* [#754798] hover:to-[#a65ea3] */}
                {isJoin && (
                    <>
                        <div className="flex-row w-fit h-full pt-10 pb-20 pr-4 absolute left-0 z-[100]">
                            <div className="w-fit h-full bg-white drop-shadow-lg border-2 rounded-2xl rounded-l-none left-0
                        px-3">
                                <p className="font-ibm-thai mt-4 ml-1 flex font-bold">
                                    <p className="text-lg my-auto">ห้อง:</p>
                                    <p className="ml-1 font-ibm-thai font-bold text-violet-900 text-xl">{roomId}</p>

                                </p>
                                {playerNames && playerProfiles && playerNames.map((name, index) => (
                                    <div className={`flex border-2 my-2 rounded-r-[25px] rounded-l-[100px] pl-1 pr-2 
                                border-[#703a9a] bg-gradient-to-r ${index === currentPlayer && start ? "from-[#EEC371] to-[#e6b150]"
                                            : "from-[#ad4ea8] to-[#a43d9f]"}`}>
                                        <img src={playerProfiles[index]}
                                            className="w-12 rounded-full my-1 border-1 p-[1.5px] border-white bg-white ml-[1px]" />
                                        <p className={`my-auto mx-2 text-xl text-white tracking-widest font-golos`}>
                                            {name.length > 10 ? name.slice(0, 10) + "..." : name}
                                        </p>

                                        {index === currentPlayer && start &&
                                            <MdColorLens className="text-3xl my-auto text-[#703a9a] mr-1" />}
                                        {index === 0 && !start && <FaCrown className="text-2xl my-auto bg-white rounded-full p-1 text-[#703a9a] mr-1" />}
                                    </div>
                                ))}
                                {!start && (
                                    <div className="flex border-2 my-2 rounded-r-[25px] rounded-l-[100px] pl-1 pr-2 
                             border-[#703a9a] bg-white p-[1.5px]">
                                        <div className="w-12 h-12 my-1 border-[#703a9a] bg-slate-300 rounded-full ml-[1px] p-[1.5px]
                                 border-2"></div>
                                        <p className="my-auto mx-2 text-xl text-[#703a9a] font-golos font-bold tracking-wider">
                                            Empty
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div></>
                )}

                {isJoin && start && (<>
                    <img src="/assets/astranaunt-painting.png"
                        id="astranaunt-painting"
                        className="max-w-md absolute -z-10" />
                    <div className="h-fit w-full max-w-[52rem] mx-auto grid grid-cols-12 z-10 mt-10 ">
                        {userData && playerNames[currentPlayer] !== userData.username && <div clasName="col-span-1"></div>}
                        <div className={`${userData && playerNames[currentPlayer] === userData.username ? "col-span-full" : "col-span-11"}`}>
                            {/* <p>ผู้เล่น: {playerNames[currentPlayer]}</p> */}
                            {userData && playerNames[currentPlayer] === userData.username && (
                                <div className="text-3xl font-ibm-thai font-bold text-center flex w-full ">
                                    {quizData && !waiting && <div className="text-center mx-auto flex">
                                        <p className="text-gray-800">โจทย์:</p>
                                        <p className="ml-2 text-[#864db3]">{quizData[currentPlayer]}</p>
                                    </div>}
                                </div>
                            )}
                            <p className="text-2xl font-ibm-thai font-bold">คนวาด: {playerNames[currentPlayer]}</p>
                            <div className="w-full flex mb-1">
                                <MdAccessTimeFilled className="text-2xl my-auto z-[10] text-violet-900" />
                                <div className="w-full h-4  my-auto border-[2px] -ml-2 z-[2] rounded-r-md 
                            border-violet-900">
                                    <div style={{ width: barWidth }}
                                        className={`h-full bg-gradient-to-r from-[#a279c2] to-[#a746a2] ease-linear duration-300`}></div>
                                </div>
                            </div>
                        </div>
                        {userData && playerNames[currentPlayer] !== userData.username && <div clasName="col-span-1"></div>}
                        <div className={`w-full h-[55vh] mt-0 rounded-l-2xl bg-white border-2 rounded-bl-none rounded-br-none
                    ${userData && playerNames[currentPlayer] === userData.username ? "rounded-r-none" : "rounded-r-2xl"}
                    ${userData && playerNames[currentPlayer] === userData.username ? "col-span-11" : "col-span-11"}`}
                            id="canvas-container">
                            <Canvas
                                currentPlayerName={playerNames[currentPlayer]}
                                username={userData && (userData.username)}
                                color={color}
                                clear={clear}
                                waiting={waiting}
                                size={size}
                                socket={socket}
                                roomId={roomId} />
                        </div>
                        {userData && playerNames[currentPlayer] === userData.username &&
                            (<div className="col-span-1 rounded-r-lg border-2 border-l-[0px] bg-sky-500 relative h-full">
                                <div className="grid grid-cols-3 h-fit">
                                    {pencil_color_list.map((item, index) => {
                                        let ml = '';
                                        let mr = '';
                                        if (index % 3 === 0) {
                                            ml = 'ml-2';
                                            mr = 'mr-0';
                                        } else if (index % 3 === 1) {
                                            ml = 'ml-1';
                                            mr = 'mr-1';
                                        } else if (index % 3 === 2) {
                                            ml = 'ml-0';
                                            mr = 'mr-2';
                                        }
                                        return (
                                            <div
                                                key={index}
                                                style={{ backgroundColor: item }}
                                                className={`rounded-sm mt-2 h-4 cursor-pointer ${ml} ${mr}`}
                                                onClick={() => handleColorChange(item)}
                                            />
                                        )
                                    })}
                                </div>
                                <div className="h-fit w-full flex mt-1">
                                    <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
                                        className="cursor-pointer ml-[0.5rem]
                            h-6 w-1/2 my-auto bg-transparent"/>
                                    <div className="w-1/2 ml-1 mr-2 my-1 flex border-2 rounded-md bg-white border-white">
                                        <FaEraser className="m-auto text-xl p-[1px] cursor-pointer"
                                            onClick={() => handleColorChange("#ffffff")} />
                                    </div>
                                </div>
                                <div className="w-full h-1/2 pb-10">
                                    <div className="w-full h-full flex relative pb-4">
                                        <RiBrushFill className="text-2xl bg-white p-[2px] rounded-full mx-auto mt-1" />
                                        <input id="large-range" type="range" value={size} min="5" max="100"
                                            onChange={(event) => setSize(parseInt(event.target.value))}
                                            className="w-[100px] 2xl:w-[120px] h-5 bg-white rounded-lg m-auto -mb-2
                            appearance-none cursor-pointer range-lg absolute bottom-1/2 -right-[25%] 2xl:-right-[41%]
                            transform -rotate-90"/>

                                    </div>
                                </div>
                                <div className="w-full my-1 flex border-2 col-span-3
                        border-none cursor-pointer absolute bottom-1" onClick={() => { setClear(Date.now()) }}>
                                    <div className="mx-2 w-full h-full bg-red-500 py-1 rounded-md hover:bg-red-600">
                                        <p className="text-center font-golos font-bold text-white my-auto tracking-wider">
                                            Clear
                                        </p>
                                    </div>
                                </div>
                            </div>)}
                        {userData && playerNames[currentPlayer] !== userData.username && <div className="col-span-1"></div>}
                        <div className="col-span-6 h-fit py-20 relative border-2 border-t-0 rounded-bl-xl border-r-0 bg-white">
                            <div className="absolute top-2 left-1">
                                {answerList.slice(-4).map((answer, index) => {
                                    if (answer.isCorrect) {
                                        if (answer.username === userData.username) {
                                            return (
                                                <p className="w-fit h-fit ml-2 font-ibm-thai flex font-bold" key={index}>
                                                    {/* <span className="text-gray-600">{answer.username===userData.username?
                                                    "คุณ":answer.username}:</span> */}
                                                    <span className="ml-0 text-[#a746a2]">{answer.answer}</span>
                                                    <span className="ml-2 text-green-800">เป็นคำตอบที่ถูกต้อง</span>
                                                </p>
                                            );
                                        } else {
                                            return (
                                                <p className="w-fit h-fit ml-2 font-ibm-thai flex font-bold" key={index}>
                                                    <span className="text-gray-600">{answer.username===userData.username?
                                                    "คุณ":answer.username}</span>
                                                    <span className="ml-1 text-green-800">ตอบถูกแล้ว!</span>
                                                </p>
                                            );
                                        }
                                    } else {
                                        return (
                                            <p className="w-fit h-fit ml-2 font-ibm-thai flex font-bold" key={index}>
                                                <span className="text-gray-600">{answer.username===userData.username?
                                                    "คุณ":answer.username}:</span>
                                                <span className="ml-2 text-[#a746a2]">{answer.answer}</span>
                                            </p>
                                        );
                                    }
                                    
                                })}
                            </div>
                            <div className="w-full px-2 bottom-2 absolute ">
                                <input
                                    type="text"
                                    id="answer_box"
                                    placeholder="พิมพ์คำตอบในนี้"
                                    onKeyDown={handleKeyDown}
                                    disabled={(playerNames[currentPlayer] === userData.username) || correct}
                                    className={`w-full border-2 font-ibm-thai py-2 px-4 rounded-lg
                                     text-gray-700 focus:outline-gray-400 placeholder:text-gray-500 
                                     ${playerNames[currentPlayer] === userData.username ? "cursor-not-allowed" : ""
                                        }`}
                                    onChange={(e) => {
                                        setAnswer(e.target.value);
                                    }}
                                />
                            </div>
                        </div>
                        <div className={`${playerNames[currentPlayer] === userData.username ?
                            "col-span-6" : "col-span-5"} h-fit py-20 relative border-2 border-t-0 rounded-br-xl border-l-0 bg-white`}>
                            <div className="absolute top-2 w-full">
                                {statusList.slice(-6).map((answer, index) => (
                                    <p className="w-fit h-fit ml-2 font-ibm-thai flex font-bold" key={index}>
                                        <span className="text-gray-600">{answer}</span>
                                    </p>
                                ))}
                            </div>

                        </div>
                    </div></>)}
            </div>
        </>
    )
}
export default DrawingGame
