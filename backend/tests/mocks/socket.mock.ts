// Mock Socket.io for testing

export const mockSocket = {
  id: 'test-socket-id',
  data: {
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
    },
    roomCode: 'TEST01',
  },
  emit: jest.fn(),
  on: jest.fn(),
  join: jest.fn(),
  leave: jest.fn(),
  to: jest.fn(() => ({ emit: jest.fn() })),
  disconnect: jest.fn(),
  handshake: {
    auth: {
      token: 'test-token',
    },
  },
};

export const mockIo = {
  on: jest.fn(),
  to: jest.fn(() => ({ emit: jest.fn() })),
  emit: jest.fn(),
  use: jest.fn(),
  close: jest.fn(),
};

export const resetSocketMocks = () => {
  mockSocket.emit.mockReset();
  mockSocket.on.mockReset();
  mockSocket.join.mockReset();
  mockSocket.leave.mockReset();
  mockSocket.disconnect.mockReset();
  mockIo.on.mockReset();
  mockIo.emit.mockReset();
  mockIo.use.mockReset();
};
