const {spawn, execSync} = require('child_process');
const fs = require('fs');
const cors = require('cors');
const express = require('express');
const os = require('os');
const path = require('path');
const net = require('net');
const app = express();
const CHECK_INTERVAL = 10000; // 10초 간격으로 서버 상태 확인

// IP 파일 경로 설정
const ipFileIpAddressPath = `${process.env.LOCALAPPDATA}\\Programs\\UIMD\\web\\viewer\\viewerServerIP.txt`;

// CORS 미들웨어 설정
const ipAddress = getIpFromFile(ipFileIpAddressPath);
app.use(cors({
    origin: ipAddress, // 클라이언트 도메인
    credentials: true // 자격 증명 포함 요청 허용
}));

/**
 * IP 파일에서 IP 주소를 가져오는 함수
 */
function getIpFromFile(filePath) {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        const match = data.match(/ip=([^\s]+)/);
        const port = data.match(/port=([^\s]+)/);
        const host = data.match(/host=([^\s]+)/);
        return { ip: match[1], port: port[1], host: host[1] };
    } catch (error) {
        console.error('Error reading the IP file:', error.message);
        return null;
    }
}

/**
 * 로컬 IP 주소를 가져오는 함수
 */
function getLocalIp() {
    const interfaces = os.networkInterfaces();
    for (const iface in interfaces) {
        for (const details of interfaces[iface]) {
            if (details.family === 'IPv4' && !details.internal) {
                return details.address;
            }
        }
    }
    return null;
}

/**
 * 포트 점유 여부를 확인하는 함수
 */
function isPortInUse(port, callback) {
    const server = net.createServer();
    server.once('error', (err) => {
        callback(err.code === 'EADDRINUSE');
    });
    server.once('listening', () => {
        server.close();
        callback(false);
    });
    server.listen(port);
}

/**
 * 특정 포트에서 실행 중인 프로세스를 종료하는 함수
 */
function killProcessOnPort(port) {
    try {
        const result = execSync(`netstat -ano | findstr :${port}`);
        const lines = result.toString().split('\n');
        lines.forEach(line => {
            const match = line.trim().match(/\s(\d+)\s*$/); // PID 추출
            if (match) {
                const pid = match[1];
                console.log(`기존 프로세스 종료 중: PID ${pid}`);
                execSync(`taskkill /PID ${pid} /F`);
            }
        });
    } catch (err) {
        console.log('종료할 서버 프로세스가 없습니다.');
    }
}

/**
 * /close API
 */
app.get('/close', (req, res) => {
    const requestIp = req.query.ip;
    const localIp = getLocalIp();
    console.log('Local IP:', localIp);
    console.log('Request IP:', requestIp);

    // 브라우저와 Node.js 프로세스 종료
    const taskkill = spawn('cmd.exe', ['/c', 'taskkill /F /IM msedge.exe'], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true
    });
    taskkill.unref();

    const closeNode = spawn('cmd.exe', ['/c', 'taskkill /F /IM node.exe']);
    closeNode.on('error', (err) => {
        console.error('Node.js 종료 실패:', err);
    });
    closeNode.unref();

    res.send('닫기 성공');
    process.exit(0);
});

app.get('/', (req, res) => {
    const text = `
    <style>
          body {
            text-align: center;
            margin-top: 12%;
            }
    </style>
    <h1>MAIN PC를 확인 해주세요.<br> MAIN PC에 프로그램을 실행 시켜주세요.</h1>
    <h1>"Please check the MAIN PC.<br> Please run the program on the MAIN PC."</h1>
    `
    res.send(text);
});


// 서버 설정
const PORT = 3000;
const ipFilePath = `${process.env.LOCALAPPDATA}\\Programs\\UIMD\\web\\viewer\\viewerServerIP.txt`;
const { ip, port, host } = getIpFromFile(ipFilePath);

if (ip) {
    isPortInUse(PORT, (inUse) => {
        if (inUse) {
            console.log(`포트 ${PORT}는 이미 사용 중입니다. 기존 프로세스를 종료합니다.`);
            killProcessOnPort(PORT);
        }

        // 새로운 서버 시작
        app.listen(PORT, async () => {
            console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
            checkTCPConnection(host, 3002);
        });
    });
} else {
    console.error('IP 주소를 가져올 수 없습니다.');
}

// ping 명령어로 서버가 켜져 있는지 확인하는 함수
function checkTCPConnection(host, port) {
    const socket = new net.Socket();
    socket.setTimeout(1000); // 타임아웃 설정 (3초)

    socket.on('connect', () => {
        const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
        const browser = spawn(edgePath, [ip+ ':'+ '8080']);
        browser.unref();
        socket.destroy(); // 연결 종료
    });

    socket.on('timeout', () => {
        console.log(`서버 ${host}:${port}에 연결 타임아웃.`);
        const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
        const browser = spawn(edgePath, ['http://localhost:3000/']);
        browser.unref();
        socket.destroy();
    });

    socket.on('error', (err) => {
        const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
        const browser = spawn(edgePath, ['http://localhost:3000/']);
        browser.unref();
        console.log(`서버 ${host}:${port}에 연결 실패: ${err.message}`);
    });

    socket.connect(port, host);
}

