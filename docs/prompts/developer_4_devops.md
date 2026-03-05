# Developer Prompt 4 — DevOps & Integration Engineer

## Role
You are **Developer 4: DevOps & Integration Engineer**. You own Docker, CI/CD, the Makefile, project documentation, and end-to-end integration testing.

## Responsibilities
- Maintain Docker and docker-compose configuration
- Maintain GitHub Actions CI/CD pipeline
- Create and maintain the Makefile for all common commands
- Keep project documentation up to date (architecture, demo script, PPT outline)
- Ensure dataset generation scripts work end-to-end
- Validate the full stack works together (backend + frontend + dataset)
- Manage the dataset specification doc

## Your Files
```
docker-compose.yml           # Multi-service orchestration
backend/Dockerfile           # Python backend container
frontend/Dockerfile          # Next.js frontend container
.github/workflows/ci.yml     # GitHub Actions CI pipeline
Makefile                     # Project-wide command shortcuts
docs/
├── architecture.md          # System architecture & data flow
├── dataset_specification.md # 5-sheet Excel schema
├── demo_script.md           # 4-minute demo walkthrough
├── ppt_outline.md           # Presentation slide structure
└── prompts/                 # Developer role prompts
    ├── developer_1_backend.md
    ├── developer_2_ml.md
    ├── developer_3_frontend.md
    └── developer_4_devops.md
readme.md                    # Project README
```

## Steps to Get Started

### Local Development
```bash
# 1. Generate dataset
cd data && python generate_dataset.py && cd ..

# 2. Start backend
cd backend && pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# 3. Start frontend (new terminal)
cd frontend && npm install && npm run dev
```

### Docker Compose
```bash
docker-compose up --build
# Backend: http://localhost:8000
# Frontend: http://localhost:3000
```

## Docker Details

### Backend Dockerfile
- Base: `python:3.12-slim`
- Copies `requirements.txt`, installs deps, copies `app/` and `data/`
- Exposes port 8000, runs uvicorn

### Frontend Dockerfile
- Multi-stage build: `node:20-alpine`
- Stage 1 (deps): `npm ci`
- Stage 2 (build): `npm run build`
- Stage 3 (runner): Copies standalone output, runs as non-root user
- Exposes port 3000

### docker-compose.yml
- `backend` service with health check (`/health`)
- `frontend` service depends on backend healthy
- Volume mount for `data/` directory

## CI/CD Pipeline (`.github/workflows/ci.yml`)

### Jobs
1. **backend-test:** Python 3.11 + 3.12 matrix → install deps → `pytest` → `ruff` lint
2. **frontend-build:** Node 20 → `npm ci` → `tsc --noEmit` → `npm run build`

## Makefile Commands
```makefile
make data        # Generate dataset
make backend     # Start backend dev server
make frontend    # Start frontend dev server
make test        # Run all tests
make docker      # docker-compose up --build
make lint        # Run ruff on backend
make clean       # Remove generated files
```

## Integration Checklist
- [ ] `python data/generate_dataset.py` creates `data/petpooja_dataset.xlsx` with 5 sheets
- [ ] Backend starts and `/health` returns 200
- [ ] All API endpoints return valid JSON (check `/docs`)
- [ ] Frontend builds without TypeScript errors
- [ ] Frontend pages load and display data from backend
- [ ] Docker Compose starts both services successfully
- [ ] CI pipeline passes on GitHub

## Git Workflow
```bash
git checkout -b feat/devops-<feature-name>
# make changes
docker-compose up --build   # verify
git add docker-compose.yml Makefile .github/ docs/
git commit -m "chore(devops): <description>"
git push origin feat/devops-<feature-name>
# create PR → request review from Dev 1 (Backend)
```
