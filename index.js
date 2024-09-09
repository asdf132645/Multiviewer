const { spawn, execSync } = require('child_process');  // execSync를 추가로 가져옴
const fs = require('fs');
const cors = require('cors');
const express = require('express');
const app = express();
const os = require('os');
const { Service } = require('node-windows');
const path = require('path');


const ipFileIpAddressPath = `${process.env.LOCALAPPDATA}\\Programs\\UIMD\\web\\viewer\\viewerServerIP.txt`;
// const ipFilePath = 'C:\\workspace\\test\\viewerServerIP.txt';

const ipAddress = getIpFromFile(ipFileIpAddressPath);
// CORS 미들웨어 설정
app.use(cors({
    origin: ipAddress, // 클라이언트 도메인
    credentials: true // 자격 증명 포함 요청 허용
}));

// IP 주소를 가져오는 함수
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


app.get('/close', (req, res) => {
    const requestIp = req.query.ip;
    const localIp = getLocalIp();
    console.log('Local IP:', localIp);
    console.log('Request IP:', requestIp);
    const taskkill = spawn('cmd.exe', ['/c', 'taskkill /F /IM msedge.exe'], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true
    });
    taskkill.unref();

    const closeNode = spawn('cmd.exe', ['/c', 'taskkill /F /IM node.exe']);

    closeNode.on('error', (err) => {
        console.error('닫기 실패:', err);
    });

    closeNode.unref();

    res.send('닫기 성공');

    // 현재 프로세스 종료
    process.exit(0);
});

// 서버 설정
// const ipFilePath = '%LocalAppData%\\Programs\\UIMD\\web\\viewer\\viewerServerIP.txt';

const ipFilePath = `${process.env.LOCALAPPDATA}\\Programs\\UIMD\\web\\viewer\\viewerServerIP.txt`;
const ipFromFile = getIpFromFile(ipFilePath);

if (ipFromFile) {
    // 이미 실행 중인 프로세스를 찾고 종료
    try {
        const currentServer = execSync('netstat -ano | findstr :3000');
        const pid = currentServer.toString().match(/\d+$/);  // netstat 결과에서 PID 추출

        if (pid) {
            console.log(`기존 서버 종료 중: PID ${pid[0]}`);
            execSync(`taskkill /PID ${pid[0]} /F`);  // PID를 이용해 서버 프로세스 강제 종료
        }
    } catch (err) {
        console.log('종료할 서버 프로세스가 없습니다.');
    }

    // 새로운 서버 시작
    app.listen(3000, () => {
        // Edge 브라우저 열기
        const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
        const url = `${ipFromFile}`;

        const browser = spawn(edgePath, [url]);
        browser.unref();
        console.log('새로운 서버가 포트 3000에서 실행 중입니다.');
    });
} else {
    console.error('IP 주소를 가져올 수 없습니다.');
}
