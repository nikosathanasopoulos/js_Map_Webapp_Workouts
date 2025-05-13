'use strict';

// prettier-ignore
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

class Workout {
    date = new Date();
    id = (Date.now() + '').slice(-10);

    constructor(coords, distance, duration, type) {
        this.coords = coords; // [lat,long]
        this.distance = distance; //in km
        this.duration = duration; // in min
    }

    _setDescription(){
        this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()} `;
    }

}

class Running extends Workout {
    type = 'running';

    constructor(coords, distance, duration, cadence) {
        super(coords, distance, duration);
        this.cadence = cadence;
        this.calcPace();
        this._setDescription();
    }

    calcPace(){
        // min/km
        this.pace = this.duration / this.distance;
    }
}

class Cycling extends Workout {
    type = 'cycling';
    constructor(coords, distance, duration, elevation) {
        super(coords, distance, duration);
        this.elevation = elevation;
        this.calcSpeed();
        this._setDescription();
    }

    calcSpeed(){
        // km/h
        this.speed = this.distance / (this.duration/60);
    }
}

const run1 = new Running([39,-12],5,24,178);

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const clearData = document.querySelector('.reset');


class App {
    #map;
    #mapEvent;
    #mapZoomLevel = 16;
    #workouts = [];

    constructor() {

        this._getPosition();

        // Get data from local storage

        this._getLocalStorage();

        // Attach event handlers
        form.addEventListener('submit', this._newWorkout.bind(this));
        inputType.addEventListener('change', this._toggleElevationField.bind(this));
        containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
        clearData.addEventListener('click', this.reset.bind(this));
    }

    _getPosition() {
        if(navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(this._loadMap.bind(this),
                function(){alert('Could not get geolocation');
            })
        }
    }

    _loadMap(position){
        console.log(position);
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        console.log(`https://www.google.com/maps/@${latitude},${longitude}`);

        const coords = [latitude, longitude];
        this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.#map);

        L.marker(coords)
            .addTo(this.#map)
            .bindPopup('This is your location.')
            .openPopup();

        this.#map.on('click', this._showForm.bind(this));

        this.#workouts.forEach(workout => {this._renderWorkoutMarker(workout)});

    }

    _showForm(mapE){
        this.#mapEvent = mapE;
        form.classList.remove('hidden');
        inputDistance.focus();
    }

    _hideForm(){
        inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = '';
        form.style.display = 'none';
        form.classList.add('hidden');
        setTimeout(() => form.style.display = 'grid',1000);

    }

    _toggleElevationField(){

        inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
        inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    }

    _newWorkout(e){
        const validInputs = (...inputs) => inputs.every(inp => Number.isFinite(inp));
        const allPositive = (...inputs) => inputs.every(inp => inp > 0);

        e.preventDefault();

        // Get Data from form

        const type = inputType.value;
        const distance = +inputDistance.value;
        const duration = +inputDuration.value;
        let workout;

        const {lat,lng} = this.#mapEvent.latlng;

        // create relevant object
        if (type === 'running'){
            const cadence = +inputDistance.value;
            if(
                !validInputs(distance, duration, cadence) ||
                !allPositive(cadence, duration, cadence)
            )
                return alert ('Inputs have to be positive numbers');

            workout = new Running([lat,lng],distance,duration, cadence);
        }

        if (type === 'cycling'){

            const elevation = +inputElevation.value;
            if(
                !validInputs(distance, duration, elevation) ||
                !allPositive(distance, duration)
            )
                return alert ('Inputs have to be positive numbers');

            workout = new Cycling([lat,lng],distance,duration, elevation);

        }

        // Add new object to array

        this.#workouts.push(workout);


        // Render workout on map

        console.log(this.#mapEvent);

        this._renderWorkoutMarker(workout)

        // Render workout on list

        this._renderWorkout(workout);


        //hide form and clear input fields
        this._hideForm();

        // set local storage
        this._setLocalStorage();

    }

    _renderWorkoutMarker(workout) {
        L.marker(workout.coords)
            .addTo(this.#map)
            .bindPopup(L.popup({
                maxWidth: 250,
                minWidth: 100,
                autoClose: false,
                closeOnClick: false,
                className: `${workout.type}-popup`,
            }))
            .setPopupContent(`${workout.type === 'running'? '🏃‍': '🚴‍♀️'} ${workout.description}`)
            .openPopup();

    }

    _renderWorkout(workout){

        let html = `
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">
            ${workout.type === 'running'? '🏃‍': '🚴‍♀️'}♂️
            </span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
        `;
        if(workout.type === 'running'){
            html += `
            <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
        </li>
            `;
        }
        else if(workout.type === 'cycling'){
            html += `
            <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevation}</span>
            <span class="workout__unit">m</span>
          </div>
        </li>
            `;
        }

        form.insertAdjacentHTML('afterend', html);
    }

    _moveToPopup(e){
        const workoutEl = e.target.closest('.workout');
        console.log(workoutEl);

        if(!workoutEl) return;

        const workout = this.#workouts.find(work => work.id === workoutEl.dataset.id);
        console.log(workout);

        this.#map.setView(workout.coords,this.#mapZoomLevel, {
            animate: true,
            pan: {
                duration: 1
            }
        })
 //       this._renderWorkoutMarker(workout);

    }

    _setLocalStorage(){
        localStorage.setItem('workouts',JSON.stringify(this.#workouts));
    }

    _getLocalStorage(){
        const data = JSON.parse(localStorage.getItem('workouts'));
        console.log(data);

        if(!data) return;

        this.#workouts = data;
        this.#workouts.forEach(workout => {this._renderWorkout(workout)});
    }

    reset(){
        localStorage.removeItem('workouts');
        location.reload();
    }
}

const app = new App();

