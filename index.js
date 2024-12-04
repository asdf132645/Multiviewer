const { spawn, execSync } = require('child_process');
const fs = require('fs');
const cors = require('cors');
const express = require('express');
const os = require('os');
const path = require('path');
const net = require('net');
const app = express();

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
        return match ? match[1] : null;
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

// 서버 설정
const PORT = 3000;
const ipFilePath = `${process.env.LOCALAPPDATA}\\Programs\\UIMD\\web\\viewer\\viewerServerIP.txt`;
const ipFromFile = getIpFromFile(ipFilePath);

if (ipFromFile) {
    isPortInUse(PORT, (inUse) => {
        if (inUse) {
            console.log(`포트 ${PORT}는 이미 사용 중입니다. 기존 프로세스를 종료합니다.`);
            killProcessOnPort(PORT);
        }

        // 새로운 서버 시작
        app.listen(PORT, () => {
            console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);

            // Edge 브라우저 열기
            const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
            const browser = spawn(edgePath, [ipFromFile]);
            browser.unref();
        });
    });
} else {
    console.error('IP 주소를 가져올 수 없습니다.');
}
