import { useState, useContext, useEffect } from "react"
import Canvas from "./Canvas"
import { UserContext } from "../../App"
import "./canvas.css"
import { FaEraser } from 'react-icons/fa'
import { GrClearOption } from "react-icons/gr"
import { RiBrushFill } from "react-icons/ri"
import { BiUser } from "react-icons/bi"
import { IoPlanetSharp } from "react-icons/io5"
import {MdOutlineContentCopy,MdDone} from "react-icons/md"
import {AiOutlineLink} from "react-icons/ai"
import io from "socket.io-client"
const socket = io.connect("http://localhost:3001")
const DrawingGame = () => {
    const [color, setColor] = useState("#000000");
    const [size, setSize] = useState(5);
    const [clear, setClear] = useState("");
    const [isJoin, setIsJoin] = useState(false);
    const dummyUserList = ["Player 1 ", "Player 2 "];
    const [start, setStart] = useState(false);
    const [roomId, setRoomId] = useState("");
    const [playerNames, setPlayerNames] = useState([]);
    const [playerProfiles, setPlayerProfiles] = useState({});
    function generateRoomID() {
        const length = 8;
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
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
        if (roomId) {
            socket.emit("join", roomId);
            // Emit an event to the server to inform that a new player has joined the room
            socket.emit("newPlayer", { roomId, playerName: userData.username,playerProfile: userData.userProfile});
            setIsJoin(true);
        }
    };
    const handleGenerateRoomID = () => {
        const newRoomId = generateRoomID();
        setRoomId(newRoomId);
        console.log("new roomId:", newRoomId);
        if (newRoomId) {
            socket.emit("join", newRoomId);
            // Emit an event to the server to inform that a new player has joined the room
            socket.emit("newPlayer", { roomId: newRoomId, playerName: userData.username ,playerProfile: userData.userProfile});
            setIsJoin(true);
        }
    };
    const handleStartGame = () => {
        setStart(true);
        socket.emit("startGame", roomId);
    };
    useEffect(() => {
        if (roomId) {
            socket.on("playerList", ({playerNames, playerProfiles}) => {
                console.log(playerNames);
                console.log(playerProfiles)
                setPlayerProfiles(playerProfiles);
                setPlayerNames(playerNames);
            });
        }
        socket.on("startGame", () => {
            setStart(true);
        });
        return () => {
            socket.off("playerList");
        };
    }, [roomId]);
    const [copyLink,setCopyLink] = useState(false);
    return (
        <div className="w-full h-screen flex">
            {!isJoin && userData && (
                <div className="w-full max-w-4xl h-full mx-auto p-4">
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
                                    <input type="text" name="roomId" id="roomId" onChange={(event) => setRoomId(event.target.value)}
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
                <div className="w-full max-w-4xl h-full mx-auto p-4 relative">
                    <div className="flex w-fit mx-auto mt-6" 
                    onClick={()=>{
                        navigator.clipboard.writeText(roomId);
                        setCopyLink(true)}} 
                    onMouseLeave={()=>{
                        setTimeout(() => {
                            setCopyLink(false)
                          }, 1000);
                    }}>
                        <p className="font-ibm-thai text-xl mt-[6px] mr-2">ห้อง: </p>
                        <p className="text-3xl font-golos font-bold text-violet-900 cursor-pointer">{roomId}</p>
                        {!copyLink ? <MdOutlineContentCopy className="ml-1 text-2xl my-auto cursor-pointer text-violet-900"/>
                        :<MdDone className="ml-1 text-2xl my-auto cursor-pointer text-green-500"/>}
                    </div>
                    <p id="loading-text" className="font-ibm-thai font-bold text-xl text-center mt-4"
                    >กำลังรอผู้เล่นคนอื่น<span id="dot-animation"></span></p>
                    <img src="/assets/drawing-game_page/animal group.png" id="animal_group_waiting"
                    className="w-3/4 auto top-24  absolute"/>
                </div>
                <div className="flex-row w-fit h-full pt-10 pb-20 px-4 absolute left-0 z-[100]">
                    <div className="w-full h-full bg-white drop-shadow-lg border-2 rounded-xl px-3">
                        <p className="font-ibm-thai mt-4 ml-1 flex font-bold">
                            <p className="text-lg my-auto">ห้อง:</p>
                            <p className="ml-1 font-golos font-semibold text-violet-900 text-xl">{roomId}</p>
                            
                        </p>
                            {playerNames && playerProfiles && playerNames.map((name, index) => (
                                <div className="flex my-2 px-2 rounded-lg border-2">
                                   <img src={playerProfiles[index]}
                                    className="w-12 rounded-full my-2 border-2 p-[1.5px] 
                                    border-blue-800"/>
                                    <p className="my-auto ml-2 text-xl text-purple-800 font-semibold opacity-60 font-golos">{name}</p>
                                </div>
                            ))}
                    </div>
                </div>
                </>
            )}
            {isJoin && start && (<>
                <img src="/assets/astranaunt-painting.png"
                    id="astranaunt-painting"
                    className="max-w-md absolute -z-10" />
                <div className="h-fit w-full max-w-[52rem] mx-auto grid grid-cols-12 z-10">
                    <div className="w-full h-[55vh] mx-auto mb-auto mt-20 rounded-l-2xl bg-white border-2 col-span-11 
                " id="canvas-container">
                        <Canvas color={color} clear={clear} size={size} socket={socket} roomId={roomId} />
                    </div>
                    <div className="col-span-1 mt-20 rounded-r-lg border-2 border-l-[0px] bg-sky-500 relative">
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
                    </div>
                </div></>)}
        </div>
    )
}
export default DrawingGame
