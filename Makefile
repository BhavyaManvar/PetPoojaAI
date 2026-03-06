.PHONY: data backend frontend test docker lint clean

# Generate the 5-sheet Excel dataset
data:
	cd data && python generate_dataset.py

# Start backend dev server
backend:
	cd backend && python -m uvicorn app.main:app --reload --port 8000

# Start frontend dev server
frontend:
	cd frontend && npm run dev

# Run all backend tests
test:
	cd backend && python -m pytest ../tests -v --tb=short

# Build and start via Docker Compose
docker:
	docker compose up --build

# Lint backend code
lint:
	ruff check backend/ tests/

# Type-check frontend
typecheck:
	cd frontend && npx tsc --noEmit

# Build frontend for production
build-frontend:
	cd frontend && npm run build

# Install all dependencies
install:
	cd backend && pip install -r requirements.txt
	cd frontend && npm install

# Remove generated files
clean:
	rm -f data/restaurant_ai_hybrid_dataset.xlsx
	rm -rf frontend/.next frontend/node_modules
	rm -rf backend/__pycache__ backend/app/__pycache__
